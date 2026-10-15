'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type FamilyMember, type MenuItem } from '@/lib/supabase'

type OrderWithDetails = {
  id: string
  notes: string | null
  submitted_at: string
  family_members: FamilyMember
  order_items: { menu_items: MenuItem }[]
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [noOrders, setNoOrders] = useState(false)
  const [loading, setLoading] = useState(true)

  const [today] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select(
          `
          id, notes, submitted_at,
          family_members(id, name, display_order),
          order_items(menu_items(id, name))
        `
        )
        .eq('date', today)
        .order('submitted_at')

      if (!data || data.length === 0) {
        setNoOrders(true)
      } else {
        setOrders(data as unknown as OrderWithDetails[])
      }
      setLoading(false)
    }

    load()

    // Live updates
    const channel = supabase
      .channel('orders-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [today])

  const todayDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="flex flex-col min-h-screen max-w-md mx-auto px-4">
      {/* Header */}
      <div className="pt-8 pb-6">
        <button
          onClick={() => router.back()}
          className="text-orange-500 text-sm mb-4 flex items-center gap-1 active:opacity-60"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">📋</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tonight&apos;s Orders</h1>
            <p className="text-sm text-gray-400">{todayDisplay}</p>
          </div>
        </div>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="flex justify-center pt-8">
            <div className="w-8 h-8 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
          </div>
        ) : noOrders ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-orange-100">
            <div className="text-4xl mb-3">🤫</div>
            <p className="text-gray-500 font-medium">No orders yet tonight</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to order!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">👤</span>
                  <span className="font-bold text-gray-900 text-lg">
                    {order.family_members.name}
                  </span>
                </div>

                {order.order_items.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {order.order_items.map((oi, i) => (
                      <span
                        key={i}
                        className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-medium border border-orange-200"
                      >
                        {oi.menu_items?.name ?? '?'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mb-2 italic">No items selected</p>
                )}

                {order.notes && (
                  <p className="text-sm text-gray-500 mt-2 italic border-t border-gray-100 pt-2">
                    &ldquo;{order.notes}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="py-6">
        <button
          onClick={() => router.push('/')}
          className="w-full py-3.5 rounded-2xl bg-orange-600 text-white font-semibold text-base active:scale-95 transition-transform"
        >
          Place My Order
        </button>
      </div>
    </main>
  )
}
