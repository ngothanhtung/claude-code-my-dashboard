"use client"

import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FileText, Paperclip, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import type { Document, DocumentFormValues } from "@/modules/documents/services/types/document-types"
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "@/modules/documents/services/types/document-types"

const documentFormSchema = z.object({
  name: z.string().min(1, "Tên tài liệu không được để trống").max(255),
  summary: z.string().max(5000),
})

type DocumentFormSchemaValues = z.infer<typeof documentFormSchema>

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileExtension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase()
  return ext ? `.${ext}` : ""
}

function FileBadge({ name, size }: { name: string; size?: number }) {
  const ext = getFileExtension(name)
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{name}</span>
      {size !== undefined && (
        <span className="text-muted-foreground">{formatFileSize(size)}</span>
      )}
    </div>
  )
}

interface DocumentFormDialogProps {
  onSave: (data: DocumentFormValues, file?: File | null) => Promise<void>
  initialData?: Document | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DocumentFormDialog({
  onSave,
  initialData,
  open,
  onOpenChange,
}: DocumentFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [existingFileName, setExistingFileName] = useState<string | null>(
    initialData?.attachment?.name ?? null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEdit = !!initialData
  const isControlled = open !== undefined && onOpenChange !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen

  const form = useForm<DocumentFormSchemaValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      summary: initialData?.summary ?? "",
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file) {
      const ext = getFileExtension(file.name)
      if (!ALLOWED_FILE_EXTENSIONS.includes(ext as typeof ALLOWED_FILE_EXTENSIONS[number])) {
        toast.error(
          `Định dạng không được hỗ trợ. Vui lòng chọn: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`
        )
        return
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`Kích thước file không được vượt quá ${formatFileSize(MAX_FILE_SIZE_BYTES)}`)
        return
      }
      setSelectedFile(file)
      setExistingFileName(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null)
    setExistingFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function simulateProgress() {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5
      if (progress >= 90) {
        clearInterval(interval)
        setUploadProgress(90)
      } else {
        setUploadProgress(progress)
      }
    }, 200)
    return () => clearInterval(interval)
  }

  async function onSubmit(data: DocumentFormSchemaValues) {
    setIsUploading(true)
    setUploadProgress(0)

    let cleanup: (() => void) | undefined
    if (selectedFile) {
      cleanup = simulateProgress()
    }

    try {
      await onSave(
        {
          name: data.name,
          summary: data.summary ?? "",
        },
        selectedFile
      )
      setUploadProgress(100)
      form.reset()
      setSelectedFile(null)
      setExistingFileName(initialData?.attachment?.name ?? null)
      setDialogOpen(false)
    } catch {
      toast.error("Đã xảy ra lỗi. Vui lòng thử lại.")
    } finally {
      cleanup?.()
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      form.reset({
        name: initialData?.name ?? "",
        summary: initialData?.summary ?? "",
      })
      setSelectedFile(null)
      setExistingFileName(initialData?.attachment?.name ?? null)
      setUploadProgress(0)
      setIsUploading(false)
    }
    setDialogOpen(open)
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <Paperclip className="mr-2 h-4 w-4" />
            Thêm tài liệu
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Chỉnh sửa tài liệu" : "Thêm tài liệu mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin tài liệu."
              : "Tạo tài liệu mới. Các trường có dấu * là bắt buộc."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tên tài liệu <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nhập tên tài liệu"
                      {...field}
                      maxLength={255}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả tóm tắt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Nhập mô tả tóm tắt tài liệu..."
                      className="resize-none"
                      rows={4}
                      {...field}
                      maxLength={5000}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>File đính kèm</FormLabel>

              {(selectedFile || existingFileName) && (
                <div className="space-y-2">
                  <FileBadge
                    name={selectedFile?.name ?? existingFileName!}
                    size={selectedFile?.size}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-muted-foreground cursor-pointer"
                    onClick={handleRemoveFile}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Xóa file
                  </Button>
                </div>
              )}

              {!selectedFile && !existingFileName && (
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_FILE_EXTENSIONS.join(",")}
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                  />
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 px-4 py-6 text-sm text-muted-foreground hover:border-muted-foreground/50 transition-colors">
                    <Upload className="size-4" />
                    <span>Chọn file hoặc kéo thả vào đây</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Định dạng: {ALLOWED_FILE_EXTENSIONS.join(", ")}. Tối đa{" "}
                {formatFileSize(MAX_FILE_SIZE_BYTES)}.
              </p>
            </div>

            {isUploading && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Đang tải lên... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isUploading}
                className="cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isUploading}
                className="cursor-pointer"
              >
                {isUploading ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm tài liệu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
