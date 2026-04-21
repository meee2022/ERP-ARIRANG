"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const { language } = useAppStore();
  const isRTL = language === "ar";
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" dir={isRTL ? "rtl" : "ltr"}>
      <div 
        ref={overlayRef}
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className={cn(
        "relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200",
        className
      )}>
        {/* Header */}
        <div className={cn("flex items-center justify-between p-4 border-b border-[#eee]", isRTL && "flex-row-reverse")}>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">{title}</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md text-[#888] hover:bg-[#f5f5f0] hover:text-[#333] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
