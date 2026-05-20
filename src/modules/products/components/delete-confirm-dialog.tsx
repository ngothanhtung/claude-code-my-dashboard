"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface DeleteConfirmDialogProps {
  productName: string
  onConfirm: () => void
}

export function DeleteConfirmDialog({
  productName,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false)

  function handleConfirm() {
    onConfirm()
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Xóa sản phẩm</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa sản phẩm</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn có chắc chắn muốn xóa sản phẩm &quot;{productName}&quot;? Hành động này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
