import { z } from "zod"

export const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".png",
  ".jpg",
] as const

export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export interface DocumentAttachment {
  name: string
  url: string
  path: string
}

export interface Document {
  id: string
  name: string
  summary: string
  attachment: DocumentAttachment | null
  createdAt: Date
  updatedAt: Date
  createdBy: string
  createdByName: string
  updatedBy: string
  updatedByName: string
}

export interface DocumentFirestore {
  id: string
  name: string
  summary: string
  attachment: DocumentAttachment | null
  createdAt: unknown
  updatedAt: unknown
  createdBy: string
  createdByName: string
  updatedBy: string
  updatedByName: string
}

export const DocumentSchema = z.object({
  name: z
    .string()
    .min(1, "Tên tài liệu không được để trống")
    .max(255, "Tên tài liệu không được vượt quá 255 ký tự"),
  summary: z.string().max(5000).optional().default(""),
})

export type DocumentFormValues = z.infer<typeof DocumentSchema>
