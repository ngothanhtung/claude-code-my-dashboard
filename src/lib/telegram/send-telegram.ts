export interface DeleteNotificationPayload {
  userName: string
  userEmail: string
  dataType: string
  dataName: string
  dataId: string
  timestamp: string
}

function formatTelegramMessage(payload: DeleteNotificationPayload): string {
  const { userName, userEmail, dataType, dataName, dataId, timestamp } = payload

  return [
    "🚨 *Cảnh báo xóa dữ liệu*",
    "",
    `👤 *Người thực hiện:* ${userName || "Không xác định"}`,
    `📧 Email: ${userEmail || "Không xác định"}`,
    "",
    `🗑️ *Đã xóa:* ${dataType}`,
    `📝 *Tên:* ${dataName}`,
    `🔖 *ID:* \`${dataId}\``,
    "",
    `⏰ *Thời gian:* ${timestamp}`,
  ].join("\n")
}

export async function sendTelegramNotification(
  message: string
): Promise<{ ok: boolean; message?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.error("[Telegram] Missing BOT_TOKEN or CHAT_ID env variables")
    return { ok: false, message: "Missing env variables" }
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("[Telegram] Send failed:", error)
    return { ok: false, message: error }
  }

  return { ok: true }
}

export async function sendDeleteNotification(
  payload: DeleteNotificationPayload
): Promise<{ ok: boolean; message?: string }> {
  const message = formatTelegramMessage(payload)
  return sendTelegramNotification(message)
}
