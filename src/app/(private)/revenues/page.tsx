"use client"

import { useEffect, useState } from "react"
import { DatabaseZap } from "lucide-react"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { RevenueChart } from "@/modules/revenues/components/revenue-chart"
import { RevenueOverview } from "@/modules/revenues/components/revenue-overview"
import {
  seedRevenues,
  subscribeRevenues,
} from "@/modules/revenues/services/revenue-services"
import type { Revenue, RevenueChartData } from "@/modules/revenues/services/types/revenue-types"

export default function RevenuesPage() {
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [chartData, setChartData] = useState<RevenueChartData[]>([])
  const [isReady, setIsReady] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeRevenues(
      (revData, chart) => {
        setRevenues(revData)
        setChartData(chart)
        setIsReady(true)
      },
      (error) => {
        toast.error("Không thể kết nối dữ liệu doanh thu.")
        setIsReady(true)
      }
    )

    return () => unsubscribe()
  }, [])

  async function handleSeed() {
    setIsSeeding(true)
    try {
      await seedRevenues()
      toast.success("Đã seed 17 bản ghi doanh thu vào Firebase Firestore.")
    } catch (err) {
      console.error("Failed to seed:", err)
      toast.error("Không thể seed dữ liệu. Kiểm tra kết nối Firebase.")
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="@container/main px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Báo cáo doanh thu
              </h1>
              <p className="text-muted-foreground">
                Thống kê và biểu đồ doanh thu theo tháng
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={isSeeding}
            >
              <DatabaseZap className="mr-2 h-4 w-4" />
              {isSeeding ? "Đang seed..." : "Seed Demo Data"}
            </Button>
          </div>
        </div>
      </div>

      <div className="@container/main px-4 lg:px-6 mt-4">
        {!isReady ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <RevenueOverview revenues={revenues} />
        )}
      </div>

      <div className="@container/main px-4 lg:px-6">
        {!isReady ? (
          <div className="flex items-center justify-center h-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : chartData.length > 0 ? (
          <RevenueChart data={chartData} />
        ) : (
          <div className="flex flex-col items-center justify-center h-100 gap-4">
            <p className="text-muted-foreground">
              Chưa có dữ liệu. Nhấn{" "}
              <strong>&quot;Seed Demo Data&quot;</strong> để tải dữ liệu mẫu vào
              Firestore.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
