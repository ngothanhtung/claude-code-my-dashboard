"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/modules/products/components/data-table"
import { ProductOverview } from "@/modules/products/components/product-overview"
import { ProductFormDialog } from "@/modules/products/components/product-form-dialog"
import {
  createProduct,
  deleteProduct,
  generateId,
  getProducts,
  updateProduct,
} from "@/modules/products/services/product-services"
import type { Product, ProductFormValues } from "@/modules/products/services/types/product-types"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    getProducts().then(setProducts)
  }, [])

  async function handleAdd(data: ProductFormValues) {
    const now = new Date().toISOString()
    const newProduct: Product = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await createProduct(newProduct)
    setProducts(prev => [newProduct, ...prev])
  }

  async function handleUpdate(data: ProductFormValues) {
    if (!editingProduct) return
    const updated: Product = {
      ...editingProduct,
      ...data,
      updatedAt: new Date().toISOString(),
    }
    await updateProduct(updated)
    setProducts(prev =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    )
    setEditingProduct(null)
    setIsEditDialogOpen(false)
  }

  async function handleDelete(id: string) {
    await deleteProduct(id)
    setProducts(prev => prev.filter((p) => p.id !== id))
  }

  function handleEdit(product: Product) {
    setEditingProduct(product)
    setIsEditDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="@container/main px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Quản lý sản phẩm
          </h1>
          <p className="text-muted-foreground">
            Danh sách và quản lý thông tin sản phẩm
          </p>
        </div>
      </div>

      <div className="@container/main px-4 lg:px-6 mt-4">
        <ProductOverview products={products} />
      </div>

      <div className="@container/main px-4 lg:px-6">
        <DataTable
          products={products}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
        />
      </div>

      {editingProduct && (
        <ProductFormDialog
          initialData={editingProduct}
          onSave={handleUpdate}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  )
}
