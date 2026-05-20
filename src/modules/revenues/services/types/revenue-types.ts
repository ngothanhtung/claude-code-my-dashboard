export interface Revenue {
  id: string
  month: number
  year: number
  revenue: number
}

export interface RevenueChartData {
  month: string
  revenue2025: number | undefined
  revenue2026: number | undefined
}
