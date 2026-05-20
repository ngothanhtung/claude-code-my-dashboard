"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { RevenueChartData } from "@/modules/revenues/services/types/revenue-types"

const chartConfig = {
  revenue2025: {
    label: "2025",
    color: "#1e293b",
  },
  revenue2026: {
    label: "2026",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toString()
}

export function RevenueChart({ data }: { data: RevenueChartData[] }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Biểu đồ doanh thu</CardTitle>
        <CardDescription>
          So sánh doanh thu theo tháng — 2025 vs 2026 (VND)
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => formatCurrency(v)}
              width={60}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString("vi-VN")} đ`,
                    name === "revenue2025" ? "2025" : "2026",
                  ]}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="revenue2025"
              fill={chartConfig.revenue2025.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              name="2025"
            />
            <Bar
              dataKey="revenue2026"
              fill={chartConfig.revenue2026.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              name="2026"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
