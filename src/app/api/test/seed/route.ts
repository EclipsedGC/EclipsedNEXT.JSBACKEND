import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { HttpStatus } from '@/lib/http-status'

// POST /api/test/seed - create three sample test records
export async function POST() {
  const samples = [
    { transaction_id: 'txn-1001', amount: 100.5 },
    { transaction_id: 'txn-1002', amount: 250.75 },
    { transaction_id: 'txn-1003', amount: 50.0 },
  ]

  try {
    for (const sample of samples) {
      // Ignore duplicates (SQLite syntax)
      await execute(
        'INSERT OR IGNORE INTO test (transaction_id, amount) VALUES (?, ?)',
        [sample.transaction_id, sample.amount]
      )
    }

    const all = await query('SELECT * FROM test ORDER BY created_at DESC')

    return NextResponse.json(
      {
        success: true,
        message: 'Seeded test records',
        data: all,
      },
      { status: HttpStatus.CREATED }
    )
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to seed test records',
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    )
  }
}
