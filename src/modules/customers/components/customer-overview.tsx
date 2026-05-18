"use client"

import { Users, UserRound, UserRoundCheck, TrendingUp } from "lucide-react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import type { Customer } from "@/modules/customers/services/types/customer-types"

interface CustomerOverviewProps {
  customers: Customer[]
}

const CHART_COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
]

const CATEGORY_LABELS: Record<string, string> = {
  Education: "Giáo dục",
  Sales: "Kinh doanh",
  Marketing: "Marketing",
  Worker: "Công nhân",
  Engineering: "Kỹ thuật",
  Healthcare: "Y tế",
  Finance: "Tài chính",
  Legal: "Pháp lý",
  Other: "Khác",
}

export function CustomerOverview({ customers }: CustomerOverviewProps) {
  const total = customers.length
  const male = customers.filter((c) => c.gender === "Male").length
  const female = customers.filter((c) => c.gender === "Female").length

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = customers.filter((c) => {
    const d = new Date(c.createdAt)
    return d >= startOfMonth
  }).length

  // Gender chart data
  const genderData = [
    { name: "Nam", value: male, fill: "var(--primary)" },
    { name: "Nữ", value: female, fill: "var(--chart-2)" },
  ]
  const genderChartConfig: ChartConfig = {
    male: { label: "Nam", color: "var(--primary)" },
    female: { label: "Nữ", color: "var(--chart-2)" },
  }

  // Category chart data
  const categoryMap: Record<string, number> = {}
  customers.forEach((c) => {
    categoryMap[c.category] = (categoryMap[c.category] || 0) + 1
  })
  const categoryData = Object.entries(categoryMap).map(([name, value], i) => ({
    name: CATEGORY_LABELS[name] || name,
    value,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }))
  const categoryChartConfig: ChartConfig = Object.fromEntries(
    categoryData.map((d) => [d.name, { label: d.name, color: d.fill }])
  )

  const stats = [
    {
      title: "Tổng khách hàng",
      value: total,
      icon: Users,
      change: "+0",
      description: "Tổng số khách hàng",
      color: "text-primary",
    },
    {
      title: "Nam",
      value: male,
      icon: UserRound,
      change: `${total > 0 ? Math.round((male / total) * 100) : 0}%`,
      description: `${total > 0 ? Math.round((male / total) * 100) : 0}% tổng khách hàng`,
      color: "text-primary",
    },
    {
      title: "Nữ",
      value: female,
      icon: UserRoundCheck,
      change: `${total > 0 ? Math.round((female / total) * 100) : 0}%`,
      description: `${total > 0 ? Math.round((female / total) * 100) : 0}% tổng khách hàng`,
      color: "text-chart-2",
    },
    {
      title: "Mới tháng này",
      value: newThisMonth,
      icon: TrendingUp,
      change: newThisMonth > 0 ? "+" + newThisMonth : "0",
      description: "Khách hàng đăng ký tháng " + (now.getMonth() + 1),
      color: "text-chart-4",
    },
  ]

  return (
    <div className="grid gap-4">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 @4xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="border">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <span className={`${stat.color} size-6`}>
                    <Icon className="size-6" />
                  </span>
                  <Badge variant="outline" className="font-normal">
                    {stat.change}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-muted-foreground text-xs">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bố giới tính</CardTitle>
            <CardDescription>Tỷ lệ Nam / Nữ trong tổng khách hàng</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={genderChartConfig} className="h-52 w-full">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={<ChartTooltipContent hideLabel indicator="dot" />}
                />
              </PieChart>
            </ChartContainer>
            <div className="mt-2 flex justify-center gap-6 text-sm">
              {genderData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.fill }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bố theo danh mục</CardTitle>
            <CardDescription>Số lượng khách hàng theo từng danh mục</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryChartConfig} className="h-52 w-full">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  content={<ChartTooltipContent hideLabel indicator="dot" nameKey="name" />}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
