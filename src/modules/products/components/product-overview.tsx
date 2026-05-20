"use client"

import { Package, Tag, TrendingDown, TrendingUp } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/modules/products/services/types/product-types"

interface ProductOverviewProps {
  products: Product[]
}

export function ProductOverview({ products }: ProductOverviewProps) {
  const total = products.length
  const inStock = products.filter((p) => p.in_stock).length
  const outOfStock = total - inStock
  const onSale = products.filter((p) => p.discount > 0).length

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = products.filter((p) => {
    const d = new Date(p.createdAt)
    return d >= startOfMonth
  }).length

  const stats = [
    {
      title: "Tổng sản phẩm",
      value: total,
      icon: Package,
      change: total > 0 ? "+" + newThisMonth : "0",
      description: "Tổng số sản phẩm trong kho",
      color: "text-primary",
    },
    {
      title: "Đang bán",
      value: inStock,
      icon: TrendingUp,
      change: total > 0 ? `${Math.round((inStock / total) * 100)}%` : "0%",
      description: "Sản phẩm sẵn sàng bán",
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Hết hàng",
      value: outOfStock,
      icon: TrendingDown,
      change: total > 0 ? `${Math.round((outOfStock / total) * 100)}%` : "0%",
      description: "Sản phẩm hết hàng",
      color: "text-red-600 dark:text-red-400",
    },
    {
      title: "Đang giảm giá",
      value: onSale,
      icon: Tag,
      change: onSale > 0 ? `${onSale} sp` : "0 sp",
      description: "Sản phẩm đang được giảm giá",
      color: "text-orange-600 dark:text-orange-400",
    },
  ]

  return (
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
  )
}
