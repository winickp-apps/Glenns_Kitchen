'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type FamilyMember, type MenuItem } from '@/lib/supabase'

type AdminView = 'lock' | 'menu' | 'members'

export default function AdminPage() {
  const router = useRouter()
  const [view, setView] = useState<AdminView>('lock')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)

  // Menu state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  // Members state
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  const [today] = useState(() => new Date().toISOString().split('T')[0])

  async function verifyPin() {
    setPinLoading(true)
    setPinError(false)
    const { data } = await supabase.rpc('verify_admin_pin', { input_pin: pin })
    if (data === true) {
      setView('menu')
      loadMenu()
      loadMembers()
    } else {
      setPinError(true)
    }
    setPinLoading(false)
  }

  async function loadMenu() {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('date', today)
      .order('created_at')
    setMenuItems(data ?? [])
  }

  async function loadMembers() {
    const { data } = await supabase
      .from('family_members')
      .select('*')
      .order('display_order')
    setMembers(data ?? [])
  }

  useEffect(() => {
    if (view !== 'lock') {
      loadMenu()
      loadMembers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  async function addMenuItem() {
    if (!newItemName.trim()) return
    setAddingItem(true)
    await supabase.from('menu_items').insert({
      name: newItemName.trim(),
      description: newItemDesc.trim() || null,
      date: today,
    })
    setNewItemName('')
    setNewItemDesc('')
    await loadMenu()
    setAddingItem(false)
  }

  async function removeMenuItem(id: string) {
    await supabase.from('menu_items').delete().eq('id', id)
    setMenuItems((prev) => prev.filter((m) => m.id !== id))
  }

  async function addMember() {
    if (!newMemberName.trim()) return
    setAddingMember(true)
    await supabase.from('family_members').insert({
      name: newMemberName.trim(),
      display_order: members.length,
    })
    setNewMemberName('')
    await loadMembers()
    setAddingMember(false)
  }

  async function removeMember(id: string) {
    await supabase.from('family_members').delete().eq('id', id)
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  if (view === 'lock') {
    return (
      <main className="flex flex-col min-h-screen max-w-md mx-auto px-4">
        <div className="pt-8 pb-6">
          <button
            onClick={() => router.push('/')}
            className="text-orange-500 text-sm mb-4 flex items-center gap-1 active:opacity-60"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔐</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin</h1>
              <p className="text-sm text-gray-400">Enter your PIN to continue</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value)
              setPinError(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
            placeholder="Enter PIN"
            maxLength={8}
            className={`w-full rounded-xl border-2 bg-white px-4 py-4 text-center text-2xl tracking-widest font-bold focus:outline-none ${
              pinError ? 'border-red-400' : 'border-orange-200 focus:border-orange-400'
            }`}
          />
          {pinError && (
            <p className="text-red-500 text-sm text-center">Wrong PIN, try again</p>
          )}
          <button
            onClick={verifyPin}
            disabled={!pin || pinLoading}
            className="w-full py-4 rounded-2xl bg-orange-600 text-white font-bold text-lg active:scale-95 transition-transform disabled:opacity-40"
          >
            {pinLoading ? 'Checking...' : 'Unlock'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col min-h-screen max-w-md mx-auto px-4">
      {/* Header */}
      <div className="pt-8 pb-4">
        <button
          onClick={() => router.push('/')}
          className="text-orange-500 text-sm mb-4 flex items-center gap-1 active:opacity-60"
        >
          ← Back to app
        </button>
        <h1 className="text-xl font-bold text-gray-900">⚙️ Admin</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-5">
        {(['menu', 'members'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              view === tab
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-500 border border-orange-100'
            }`}
          >
            {tab === 'menu' ? '🍽️ Tonight\'s Menu' : '👥 Family'}
          </button>
        ))}
      </div>

      {/* Menu tab */}
      {view === 'menu' && (
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-3">
            Add items for tonight. They&apos;ll appear on everyone&apos;s order screen.
          </p>

          <div className="flex flex-col gap-2 mb-4">
            <input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name (e.g. Grilled Salmon)"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400"
            />
            <input
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              placeholder="Short description (optional)"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400"
            />
            <button
              onClick={addMenuItem}
              disabled={!newItemName.trim() || addingItem}
              className="w-full py-3 rounded-xl bg-orange-600 text-white font-semibold active:scale-95 transition-transform disabled:opacity-40"
            >
              {addingItem ? 'Adding...' : '+ Add to Menu'}
            </button>
          </div>

          {menuItems.length === 0 ? (
            <div className="text-center text-gray-400 py-6 text-sm">
              No items on tonight&apos;s menu yet
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-orange-100"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-400">{item.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeMenuItem(item.id)}
                    className="text-red-400 pl-3 active:opacity-60 text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {view === 'members' && (
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-3">
            Manage who shows up on the name picker.
          </p>

          <div className="flex gap-2 mb-4">
            <input
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMember()}
              placeholder="Name (e.g. Sarah)"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400"
            />
            <button
              onClick={addMember}
              disabled={!newMemberName.trim() || addingMember}
              className="px-5 py-3 rounded-xl bg-orange-600 text-white font-semibold active:scale-95 transition-transform disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {members.length === 0 ? (
            <div className="text-center text-gray-400 py-6 text-sm">
              No family members yet
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-xl px-4 py-3.5 flex items-center justify-between border border-orange-100"
                >
                  <div className="flex items-center gap-2">
                    <span>👤</span>
                    <span className="font-semibold text-gray-900">{member.name}</span>
                  </div>
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-red-400 pl-3 active:opacity-60 text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="py-6" />
    </main>
  )
}
