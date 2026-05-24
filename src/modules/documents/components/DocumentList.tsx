"use client"

import type { Document, DocumentFormValues } from "@/modules/documents/services/types/document-types"
import { DocumentTable } from "./DocumentTable"
import { DocumentFormDialog } from "./DocumentFormDialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DocumentListProps {
  documents: Document[]
  isLoading: boolean
  editingDocument: Document | null
  isEditDialogOpen: boolean
  onEdit: (doc: Document) => void
  onAdd: (data: DocumentFormValues) => Promise<void>
  onUpdate: (data: DocumentFormValues, file?: File | null) => Promise<void>
  onEditDialogOpenChange: (open: boolean) => void
  deletingDocument: Document | null
  onDelete: (doc: Document) => void
  onConfirmDelete: () => Promise<void>
  onDeleteDialogOpenChange: (open: boolean) => void
}

export function DocumentList({
  documents,
  isLoading,
  editingDocument,
  isEditDialogOpen,
  onEdit,
  onAdd,
  onUpdate,
  onEditDialogOpenChange,
  deletingDocument,
  onDelete,
  onConfirmDelete,
  onDeleteDialogOpenChange,
}: DocumentListProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="@container/main px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Quản lý Tài liệu
          </h1>
          <p className="text-muted-foreground">
            Danh sách và quản lý tài liệu
          </p>
        </div>
      </div>

      <div className="@container/main px-4 lg:px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {isLoading ? "Đang tải..." : `${documents.length} tài liệu`}
          </div>
          <DocumentFormDialog onSave={onAdd} />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Đang tải dữ liệu...</div>
          </div>
        ) : (
          <DocumentTable documents={documents} onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>

      {editingDocument && (
        <DocumentFormDialog
          initialData={editingDocument}
          onSave={onUpdate}
          open={isEditDialogOpen}
          onOpenChange={onEditDialogOpenChange}
        />
      )}

      <AlertDialog
        open={deletingDocument !== null}
        onOpenChange={onDeleteDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài liệu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa tài liệu &quot;{deletingDocument?.name}&quot; không?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xóa tài liệu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
