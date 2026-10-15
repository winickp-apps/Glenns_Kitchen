'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type MenuItem } from '@/lib/supabase'

export default function OrderPage() {
  const router = useRouter()
  const [memberName, setMemberName] = useState<string | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null)

  const [today] = useState(() => new Date().toISOString().split('T')[0])

  const loadData = useCallback(async (id: string) => {
    const [menuRes, orderRes] = await Promise.all([
      supabase
        .from('menu_items')
        .select('*')
        .eq('date', today)
        .order('created_at'),
      supabase
        .from('orders')
        .select('*, order_items(menu_item_id)')
        .eq('family_member_id', id)
        .eq('date', today)
        .maybeSingle(),
    ])

    setMenuItems(menuRes.data ?? [])

    if (orderRes.data) {
      setExistingOrderId(orderRes.data.id)
      setNotes(orderRes.data.notes ?? '')
      const ids = new Set<string>(
        (orderRes.data.order_items ?? []).map(
          (oi: { menu_item_id: string }) => oi.menu_item_id
        )
      )
      setSelected(ids)
      setSubmitted(true)
    }

    setLoading(false)
  }, [today])

  useEffect(() => {
    const id = localStorage.getItem('gk_member_id')
    const name = localStorage.getItem('gk_member_name')
    if (!id || !name) {
      router.replace('/')
      return
    }
    setMemberId(id)
    setMemberName(name)
    loadData(id)
  }, [router, loadData])

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    if (submitted) setSubmitted(false)
  }

  async function submitOrder() {
    if (!memberId) return
    setSubmitting(true)

    try {
      let orderId = existingOrderId

      if (!orderId) {
        const { data, error } = await supabase
          .from('orders')
          .insert({ family_member_id: memberId, date: today, notes })
          .select('id')
          .single()
        if (error) throw error
        orderId = data.id
        setExistingOrderId(orderId)
      } else {
        await supabase
          .from('orders')
          .update({ notes, updated_at: new Date().toISOString() })
          .eq('id', orderId)
        await supabase.from('order_items').delete().eq('order_id', orderId)
      }

      if (selected.size > 0) {
        await supabase.from('order_items').insert(
          Array.from(selected).map((menu_item_id) => ({
            order_id: orderId,
            menu_item_id,
          }))
        )
      }

      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="flex flex-col min-h-screen max-w-md mx-auto px-4">
      {/* Header */}
      <div className="pt-8 pb-6">
        <button
          onClick={() => router.push('/')}
          className="text-orange-500 text-sm mb-4 flex items-center gap-1 active:opacity-60"
        >
          ← Switch name
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍳</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tonight&apos;s Menu</h1>
            <p className="text-sm text-orange-600 font-medium">{memberName}</p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="flex-1">
        {menuItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-orange-100">
            <div className="text-4xl mb-3">🕐</div>
            <p className="text-gray-500 font-medium">Menu not posted yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Glenn will add tonight&apos;s options soon
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {menuItems.map((item) => {
              const isSelected = selected.has(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`w-full text-left rounded-2xl p-4 border-2 transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-white border-orange-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Custom request */}
        <div className="mt-4">
          {menuItems.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}
          <label className="block text-sm font-medium text-gray-600 mb-2">
            {menuItems.length > 0
              ? "Want something different? Write your own request"
              : "What do you want tonight?"}
          </label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              if (submitted) setSubmitted(false)
            }}
            placeholder={
              menuItems.length > 0
                ? "e.g. Just a salad for me, or can you do pasta?"
                : "e.g. Pizza, or just a salad please..."
            }
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-400 resize-none"
          />
        </div>
      </div>

      {/* Submit button */}
      <div className="py-6 flex flex-col gap-3">
        {submitted && (
          <div className="text-center text-green-600 font-medium text-sm">
            ✓ Order submitted! Tap below to update.
          </div>
        )}
        <button
          onClick={submitOrder}
          disabled={submitting}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 ${
            submitted
              ? 'bg-green-500 text-white'
              : 'bg-orange-600 text-white disabled:opacity-40'
          } ${submitting ? 'opacity-60' : ''}`}
        >
          {submitting
            ? 'Submitting...'
            : submitted
            ? '✓ Update Order'
            : 'Submit Order'}
        </button>
        <button
          onClick={() => router.push('/orders')}
          className="w-full py-3 rounded-2xl bg-orange-100 text-orange-700 font-semibold text-sm active:scale-95 transition-transform"
        >
          See All Orders
        </button>
      </div>
    </main>
  )
}
