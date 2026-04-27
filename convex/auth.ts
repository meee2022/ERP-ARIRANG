import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword, verifyPassword } from "./lib/crypto";

// Session duration: 7 days (acceptable for internal ERP use)
// NOTE: We store the token in localStorage on the client (see src/hooks/useAuth.tsx).
// This is acceptable for internal/intranet tools. For public-facing apps consider
// httpOnly cookies + SSR to prevent XSS token theft.
// TODO (production hardening): migrate to httpOnly cookies if the app moves to SSR.
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Simple random token generator (no crypto dependency needed for tokens)
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ─── Login ─────────────────────────────────────────────────────────────────────
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    // Normalize email — always compare lowercase so "User@Example.com" matches "user@example.com"
    const normalizedEmail = email.trim().toLowerCase();

    // Look up user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is inactive");
    }

    // Password verification with backward compatibility:
    //   - New format: "salt:sha256hex" (contains ':') → use verifyPassword()
    //   - Legacy format: plain text (no ':') → compare directly, then auto-upgrade
    let passwordOk = false;

    if (user.passwordHash.includes(":")) {
      // Hashed password — verify with crypto utility
      passwordOk = await verifyPassword(password, user.passwordHash);
    } else {
      // Legacy plain-text password — compare directly
      passwordOk = user.passwordHash === password;
      if (passwordOk) {
        // Auto-upgrade: hash and store the password for next login
        const { hash } = await hashPassword(password);
        await ctx.db.patch(user._id, { passwordHash: hash });
      }
    }

    if (!passwordOk) {
      throw new Error("Invalid credentials");
    }

    // Single-session policy: deactivate any existing active sessions for this user.
    // This prevents unlimited session accumulation and enforces one active session at a time.
    const existingSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const s of existingSessions) {
      if (s.isActive) {
        await ctx.db.patch(s._id, { isActive: false });
      }
    }

    // Create new session token
    const token = generateToken();
    const now = Date.now();

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      createdAt: now,
      expiresAt: now + SESSION_DURATION_MS,
      isActive: true,
    });

    // Resolve company via branch
    let companyId: string | null = null;
    if (user.branchIds && user.branchIds.length > 0) {
      const branch = await ctx.db.get(user.branchIds[0]);
      if (branch) companyId = branch.companyId;
    }

    return {
      sessionToken: token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchIds: user.branchIds,
        companyId,
      },
    };
  },
});

// ─── Validate Session ──────────────────────────────────────────────────────────
export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!session || !session.isActive) return null;
    if (session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) return null;

    // Resolve company via branch
    let companyId: string | null = null;
    if (user.branchIds && user.branchIds.length > 0) {
      const branch = await ctx.db.get(user.branchIds[0]);
      if (branch) companyId = branch.companyId;
    }

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchIds: user.branchIds,
      companyId,
    };
  },
});

// ─── Get Current User (alias with same logic) ─────────────────────────────────
export const getCurrentUser = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!session || !session.isActive) return null;
    if (session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) return null;

    let companyId: string | null = null;
    if (user.branchIds && user.branchIds.length > 0) {
      const branch = await ctx.db.get(user.branchIds[0]);
      if (branch) companyId = branch.companyId;
    }

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchIds: user.branchIds,
      companyId,
    };
  },
});

// ─── Logout ────────────────────────────────────────────────────────────────────
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (session) {
      await ctx.db.patch(session._id, { isActive: false });
    }
  },
});

// ─── Change Password ───────────────────────────────────────────────────────────
export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { token, currentPassword, newPassword }) => {
    // Validate session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!session || !session.isActive || session.expiresAt < Date.now()) {
      throw new Error("Session expired or invalid");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) {
      throw new Error("User not found");
    }

    // Verify current password (supports both hashed and legacy plain text)
    let currentPasswordOk = false;
    if (user.passwordHash.includes(":")) {
      currentPasswordOk = await verifyPassword(currentPassword, user.passwordHash);
    } else {
      currentPasswordOk = user.passwordHash === currentPassword;
    }

    if (!currentPasswordOk) {
      throw new Error("Current password is incorrect");
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    // Hash and store the new password
    const { hash } = await hashPassword(newPassword);
    await ctx.db.patch(user._id, { passwordHash: hash });

    return { success: true };
  },
});
