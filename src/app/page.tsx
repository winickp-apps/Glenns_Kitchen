'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type FamilyMember } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('family_members')
      .select('*')
      .order('display_order')
      .then(({ data }) => {
        setMembers(data ?? [])
        setLoading(false)
      })
  }, [])

  function selectMember(member: FamilyMember) {
    localStorage.setItem('gk_member_id', member.id)
    localStorage.setItem('gk_member_name', member.name)
    router.push('/order')
  }

  return (
    <main className="flex flex-col min-h-screen max-w-md mx-auto px-4">
      {/* Header */}
      <div className="pt-12 pb-8 text-center">
        <div className="text-5xl mb-3">🍳</div>
        <h1 className="text-3xl font-bold text-orange-700 tracking-tight">
          Glenn&apos;s Kitchen
        </h1>
        <p className="text-gray-500 mt-2 text-sm">Who&apos;s ordering tonight?</p>
      </div>

      {/* Name grid */}
      <div className="flex-1">
        {loading ? (
          <div className="flex justify-center pt-8">
            <div className="w-8 h-8 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center text-gray-400 pt-8">
            <p>No family members set up yet.</p>
            <button
              onClick={() => router.push('/admin')}
              className="mt-4 text-orange-600 underline text-sm"
            >
              Go to Admin to add family members
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => selectMember(member)}
                className="bg-white rounded-2xl p-5 text-left shadow-sm border border-orange-100 active:scale-95 transition-transform"
              >
                <div className="text-3xl mb-2">👤</div>
                <div className="font-semibold text-gray-800 text-lg leading-tight">
                  {member.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-6 flex flex-col gap-3">
        <button
          onClick={() => router.push('/orders')}
          className="w-full py-3.5 rounded-2xl bg-orange-100 text-orange-700 font-semibold text-base active:scale-95 transition-transform"
        >
          View Tonight&apos;s Orders
        </button>
        <button
          onClick={() => router.push('/admin')}
          className="w-full py-3 rounded-2xl text-gray-400 text-sm active:scale-95 transition-transform"
        >
          ⚙️ Admin
        </button>
      </div>
    </main>
  )
}
