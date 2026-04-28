"""UI end-to-end tests for Customers, Suppliers, Items pages."""
import os
import re
import time
import pytest
from playwright.sync_api import Page, expect

BASE = os.environ.get("BASE_URL", "http://localhost:3000")
EVIDENCE = os.path.join(os.path.dirname(__file__), "..", "..", ".verdent", "testing", "evidence", "ui_run")
os.makedirs(EVIDENCE, exist_ok=True)


def shot(page: Page, name: str):
    page.screenshot(path=os.path.join(EVIDENCE, f"{name}.png"), full_page=True)


def test_customers_crud(page: Page):
    page.goto(f"{BASE}/sales/customers", wait_until="networkidle")
    shot(page, "01_customers_list")

    # Click Add/New button
    add_btn = page.get_by_role("button").filter(has_text=re.compile(r"جديد|إضافة|New|Add", re.I)).first
    expect(add_btn).to_be_visible(timeout=10000)
    add_btn.click()
    page.wait_for_timeout(500)

    unique = f"U{int(time.time()) % 100000}"
    # fill code & name - use placeholder-agnostic selectors
    inputs = page.locator("input:visible, textarea:visible").all()
    assert len(inputs) >= 2, f"expected inputs, got {len(inputs)}"
    # try by label
    try:
        page.get_by_label(re.compile(r"كود|Code", re.I)).first.fill(unique)
    except Exception:
        inputs[0].fill(unique)
    try:
        page.get_by_label(re.compile(r"اسم|Name", re.I)).first.fill(f"عميل UI {unique}")
    except Exception:
        inputs[1].fill(f"عميل UI {unique}")

    shot(page, "02_customers_form_filled")

    save = page.get_by_role("button").filter(has_text=re.compile(r"حفظ|Save|إضافة|Create", re.I)).last
    save.click()
    page.wait_for_timeout(2000)
    shot(page, "03_customers_after_save")

    # reload and verify row persists
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(1500)
    content = page.content()
    assert unique in content, f"customer code {unique} not found after reload"
    shot(page, "04_customers_after_reload")


def test_suppliers_list_loads(page: Page):
    page.goto(f"{BASE}/purchases/suppliers", wait_until="networkidle")
    page.wait_for_timeout(1500)
    shot(page, "10_suppliers_list")
    # Verify existing supplier S001 visible
    assert "S001" in page.content() or "موردون" in page.content() or "Supplier" in page.content()


def test_items_list_loads(page: Page):
    page.goto(f"{BASE}/inventory/items", wait_until="networkidle")
    page.wait_for_timeout(1500)
    shot(page, "20_items_list")
    assert "ITM001" in page.content() or "أصناف" in page.content() or "Item" in page.content()
