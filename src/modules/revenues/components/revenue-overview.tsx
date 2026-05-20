"use client"

import { TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Revenue } from "@/modules/revenues/services/types/revenue-types"

function formatCurrency(value: number) {
  return value.toLocaleString("vi-VN")
}

export function RevenueOverview({ revenues }: { revenues: Revenue[] }) {
  const totalRevenue = revenues.reduce((sum, r) => sum + r.revenue, 0)
  const avgRevenue = revenues.length ? totalRevenue / revenues.length : 0

  const sortedByDate = [...revenues].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })

  const latest = sortedByDate[sortedByDate.length - 1]
  const previous = sortedByDate[sortedByDate.length - 2]

  const growth =
    latest && previous
      ? ((latest.revenue - previous.revenue) / previous.revenue) * 100
      : 0

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalRevenue)} đ</div>
          <p className="text-xs text-muted-foreground">
            {revenues.length} tháng dữ liệu
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Doanh thu TB/tháng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(avgRevenue)} đ</div>
          <p className="text-xs text-muted-foreground">
            Trung bình các tháng
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tăng trưởng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {growth >= 0 ? "+" : ""}
              {growth.toFixed(1)}%
            </span>
            {growth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            So với tháng trước ({latest?.month}/{latest?.year})
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
