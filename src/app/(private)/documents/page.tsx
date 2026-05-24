"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { DocumentList } from "@/modules/documents/components/DocumentList"
import {
  createDocument,
  deleteDocument,
  getDocuments,
  updateDocument,
} from "@/modules/documents/services/document-services"
import type { Document, DocumentFormValues } from "@/modules/documents/services/types/document-types"

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null)

  useEffect(() => {
    getDocuments()
      .then(setDocuments)
      .catch(() => toast.error("Không thể tải danh sách tài liệu."))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleAdd(data: DocumentFormValues, file?: File | null) {
    toast.loading("Đang thêm tài liệu...")
    try {
      const newDoc = await createDocument(data, file ?? null)
      setDocuments((prev) => [newDoc, ...prev])
      toast.success("Thêm tài liệu thành công.")
    } catch {
      toast.error("Thêm tài liệu thất bại. Vui lòng thử lại.")
      throw new Error("Create failed")
    }
  }

  async function handleUpdate(data: DocumentFormValues, file?: File | null) {
    if (!editingDocument) return
    toast.loading("Đang cập nhật tài liệu...")
    try {
      const updated = await updateDocument(
        editingDocument.id,
        data,
        file ?? null,
        editingDocument.attachment
      )
      setDocuments((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      )
      setEditingDocument(null)
      setIsEditDialogOpen(false)
      toast.success("Cập nhật tài liệu thành công.")
    } catch {
      toast.error("Cập nhật tài liệu thất bại. Vui lòng thử lại.")
      throw new Error("Update failed")
    }
  }

  function handleEdit(doc: Document) {
    setEditingDocument(doc)
    setIsEditDialogOpen(true)
  }

  function handleDelete(doc: Document) {
    setDeletingDocument(doc)
  }

  async function confirmDelete() {
    if (!deletingDocument) return
    toast.loading("Đang xóa tài liệu...")
    try {
      await deleteDocument(
        deletingDocument.id,
        deletingDocument.attachment?.path ?? null
      )
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDocument.id))
      setDeletingDocument(null)
      toast.success("Xóa tài liệu thành công.")
    } catch {
      toast.error("Xóa tài liệu thất bại. Vui lòng thử lại.")
    }
  }

  return (
    <DocumentList
      documents={documents}
      isLoading={isLoading}
      editingDocument={editingDocument}
      isEditDialogOpen={isEditDialogOpen}
      onEdit={handleEdit}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onEditDialogOpenChange={setIsEditDialogOpen}
      deletingDocument={deletingDocument}
      onDelete={handleDelete}
      onConfirmDelete={confirmDelete}
      onDeleteDialogOpenChange={(open) => setDeletingDocument(open ? deletingDocument : null)}
    />
  )
}
