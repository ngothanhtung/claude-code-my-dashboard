import { NextRequest, NextResponse } from "next/server"
import { sendDeleteNotification } from "@/lib/telegram/send-telegram"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, customerName, userName, userEmail } = body

    if (!customerId) {
      return NextResponse.json({ error: "Missing customerId" }, { status: 400 })
    }

    const timestamp = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID
    console.log("[API/delete] botToken:", botToken ? "✓ set" : "✗ MISSING")
    console.log("[API/delete] chatId:", chatId ? "✓ set" : "✗ MISSING")

    const result = await sendDeleteNotification({
      userName: userName || "Không xác định",
      userEmail: userEmail || "Không xác định",
      dataType: "Khách hàng",
      dataName: customerName || "Không xác định",
      dataId: customerId,
      timestamp,
    })

    console.log("[API/delete] Telegram result:", result)

    return NextResponse.json({ success: true, telegram: result })
  } catch (error) {
    console.error("[API/customers/delete] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
