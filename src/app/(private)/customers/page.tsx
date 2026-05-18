"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/modules/customers/components/data-table"
import { CustomerOverview } from "@/modules/customers/components/customer-overview"
import { CustomerFormDialog } from "@/modules/customers/components/customer-form-dialog"
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "@/modules/customers/services/customer-services"
import type { Customer, CustomerFormValues } from "@/modules/customers/services/types/customer-types"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    getCustomers().then(setCustomers)
  }, [])

  function generateId() {
    return `cust_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  async function handleAdd(data: CustomerFormValues) {
    const newCustomer: Customer = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    await createCustomer(newCustomer)
    setCustomers(prev => [newCustomer, ...prev])
  }

  async function handleUpdate(data: CustomerFormValues) {
    if (!editingCustomer) return
    const updated: Customer = { ...editingCustomer, ...data }
    await updateCustomer(updated)
    setCustomers(prev =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    )
    setEditingCustomer(null)
    setIsEditDialogOpen(false)
  }

  async function handleDelete(id: string) {
    await deleteCustomer(id)
    setCustomers(prev => prev.filter((c) => c.id !== id))
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer)
    setIsEditDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="@container/main px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Quản lý khách hàng
          </h1>
          <p className="text-muted-foreground">
            Danh sách và quản lý thông tin khách hàng
          </p>
        </div>
      </div>

      <div className="@container/main px-4 lg:px-6 mt-4">
        <CustomerOverview customers={customers} />
      </div>

      <div className="@container/main px-4 lg:px-6">
        <DataTable
          customers={customers}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
        />
      </div>

      {editingCustomer && (
        <CustomerFormDialog
          initialData={editingCustomer}
          onSave={handleUpdate}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  )
}
