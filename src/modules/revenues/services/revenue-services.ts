import {
  collection,
  doc,
  onSnapshot,
  type Unsubscribe,
  writeBatch,
} from "firebase/firestore"

import { db } from "@/lib/firebase/client"
import mockRevenues from "./data/revenues.json"
import type { Revenue, RevenueChartData } from "./types/revenue-types"

const REVENUES_COLLECTION = "revenues"

export async function seedRevenues(): Promise<void> {
  const batch = writeBatch(db)

  ;(mockRevenues as Revenue[]).forEach((rev) => {
    batch.set(doc(db, REVENUES_COLLECTION, rev.id), rev, { merge: true })
  })

  await batch.commit()
}

function convertToChartData(revenues: Revenue[]): RevenueChartData[] {
  const MONTH_NAMES = [
    "T1", "T2", "T3", "T4", "T5", "T6",
    "T7", "T8", "T9", "T10", "T11", "T12",
  ]

  const byMonth: Record<number, { rev2025?: number; rev2026?: number }> = {}
  for (let i = 1; i <= 12; i++) {
    byMonth[i] = {}
  }

  revenues.forEach((r) => {
    if (r.year === 2025) byMonth[r.month].rev2025 = r.revenue
    if (r.year === 2026) byMonth[r.month].rev2026 = r.revenue
  })

  return Object.entries(byMonth)
    .filter(([_, v]) => v.rev2025 !== undefined || v.rev2026 !== undefined)
    .map(([m, v]) => ({
      month: MONTH_NAMES[Number(m) - 1],
      revenue2025: v.rev2025,
      revenue2026: v.rev2026,
    }))
}

export function subscribeRevenues(
  onData: (revenues: Revenue[], chartData: RevenueChartData[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, REVENUES_COLLECTION),
    (snapshot) => {
      if (snapshot.empty) {
        onData([], [])
        return
      }

      const revenues: Revenue[] = snapshot.docs.map((d) => {
        const data = d.data() as Revenue
        return { ...data, id: data.id ?? d.id }
      })

      onData(revenues, convertToChartData(revenues))
    },
    (error) => {
      console.error("Firestore subscription error:", error)
      onError?.(error)
    }
  )
}
