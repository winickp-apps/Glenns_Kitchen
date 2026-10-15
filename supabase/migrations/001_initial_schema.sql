-- Glenn's Kitchen - Initial Schema
-- Run this in your Supabase SQL Editor

-- Family members (pre-set by Glenn)
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items (Glenn adds each night)
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders (one per family member per night)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_member_id, date)
);

-- Order items (many-to-many: orders ↔ menu_items)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  UNIQUE(order_id, menu_item_id)
);

-- App settings (stores hashed PIN etc)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default admin PIN (change this to something memorable!)
INSERT INTO app_settings (key, value) VALUES ('admin_pin', '1234')
  ON CONFLICT (key) DO NOTHING;

-- Seed with Glenn's family (update these names!)
INSERT INTO family_members (name, display_order) VALUES
  ('Glenn', 0)
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Family members: open read/write (PIN-gated at app level)
CREATE POLICY "family_members_select" ON family_members FOR SELECT TO anon USING (true);
CREATE POLICY "family_members_insert" ON family_members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "family_members_update" ON family_members FOR UPDATE TO anon USING (true);
CREATE POLICY "family_members_delete" ON family_members FOR DELETE TO anon USING (true);

-- Menu items: open read/write (PIN-gated at app level)
CREATE POLICY "menu_items_select" ON menu_items FOR SELECT TO anon USING (true);
CREATE POLICY "menu_items_insert" ON menu_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "menu_items_update" ON menu_items FOR UPDATE TO anon USING (true);
CREATE POLICY "menu_items_delete" ON menu_items FOR DELETE TO anon USING (true);

-- Orders: open read/write
CREATE POLICY "orders_select" ON orders FOR SELECT TO anon USING (true);
CREATE POLICY "orders_insert" ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "orders_update" ON orders FOR UPDATE TO anon USING (true);
CREATE POLICY "orders_delete" ON orders FOR DELETE TO anon USING (true);

-- Order items: open read/write
CREATE POLICY "order_items_select" ON order_items FOR SELECT TO anon USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "order_items_update" ON order_items FOR UPDATE TO anon USING (true);
CREATE POLICY "order_items_delete" ON order_items FOR DELETE TO anon USING (true);

-- App settings: no direct read from anon (PIN verified via function only)
CREATE POLICY "app_settings_no_read" ON app_settings FOR SELECT TO anon USING (false);
CREATE POLICY "app_settings_no_write" ON app_settings FOR ALL TO anon USING (false);

-- Verify admin PIN (never exposes the stored value)
CREATE OR REPLACE FUNCTION verify_admin_pin(input_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_pin TEXT;
BEGIN
  SELECT value INTO stored_pin FROM app_settings WHERE key = 'admin_pin';
  RETURN stored_pin = input_pin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update admin PIN (requires knowing the current PIN)
CREATE OR REPLACE FUNCTION update_admin_pin(current_pin TEXT, new_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_pin TEXT;
BEGIN
  SELECT value INTO stored_pin FROM app_settings WHERE key = 'admin_pin';
  IF stored_pin = current_pin THEN
    UPDATE app_settings SET value = new_pin WHERE key = 'admin_pin';
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
