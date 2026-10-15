import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type FamilyMember = {
  id: string
  name: string
  display_order: number
  created_at: string
}

export type MenuItem = {
  id: string
  name: string
  description: string | null
  date: string
  created_at: string
}

export type Order = {
  id: string
  family_member_id: string
  date: string
  notes: string | null
  submitted_at: string
  updated_at: string
  family_members?: FamilyMember
  order_items?: { menu_item_id: string; menu_items?: MenuItem }[]
}
