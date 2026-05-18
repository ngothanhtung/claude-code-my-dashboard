"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import type { Customer } from "@/modules/customers/services/types/customer-types"

function generateAvatar(name: string) {
  const names = name.split(" ")
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

function getCategoryColor(category: string) {
  switch (category) {
    case "Education":
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20"
    case "Sales":
      return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20"
    case "Marketing":
      return "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20"
    case "Worker":
      return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20"
    case "Engineering":
      return "text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-900/20"
    case "Healthcare":
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
    case "Finance":
      return "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20"
    case "Legal":
      return "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/20"
    default:
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20"
  }
}

function getGenderLabel(gender: string | null) {
  switch (gender) {
    case "Male":
      return "Nam"
    case "Female":
      return "Nữ"
    default:
      return "Chưa nhập"
  }
}

interface SortableHeaderProps {
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void }
  label: string
}

function SortableHeader({ column, label }: SortableHeaderProps) {
  const sorted = column.getIsSorted()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (sorted === false) {
      column.toggleSorting(false)
    } else if (sorted === "asc") {
      column.toggleSorting(true)
    } else {
      column.toggleSorting(undefined)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 cursor-pointer select-none"
      onClick={handleClick}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 size-4" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 size-4" />
      ) : (
        <ArrowUpDown className="ml-1 size-4 opacity-50" />
      )}
    </Button>
  )
}

interface GetColumnsOptions {
  onEdit: (customer: Customer) => void
  onDelete: (id: string) => void
}

export function getColumns({ onEdit, onDelete }: GetColumnsOptions): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label="Khách hàng" />,
      cell: ({ row }) => {
        const customer = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs font-medium">
                {generateAvatar(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{customer.name}</span>
              <span className="text-sm text-muted-foreground">{customer.email}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableHeader column={column} label="Email" />,
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "category",
      header: "Danh mục",
      cell: ({ row }) => {
        const category = row.getValue("category") as string
        return (
          <Badge variant="secondary" className={getCategoryColor(category)}>
            {category}
          </Badge>
        )
      },
    },
    {
      accessorKey: "phone",
      header: "Số điện thoại",
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("phone") || "—"}</span>
      ),
    },
    {
      accessorKey: "address",
      header: "Địa chỉ",
      cell: ({ row }) => (
        <span className="text-sm max-w-[200px] truncate block">
          {row.getValue("address") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "gender",
      header: "Giới tính",
      cell: ({ row }) => (
        <span className="text-sm">{getGenderLabel(row.getValue("gender"))}</span>
      ),
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => {
        const customer = row.original
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => onEdit(customer)}
            >
              <span className="sr-only">Sửa khách hàng</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </Button>
            <DeleteConfirmDialogWrapper
              customer={customer}
              onDelete={onDelete}
            />
          </div>
        )
      },
    },
  ]
}

function DeleteConfirmDialogWrapper({
  customer,
  onDelete,
}: {
  customer: Customer
  onDelete: (id: string) => void
}) {
  return (
    <DeleteConfirmDialog
      customerName={customer.name}
      onConfirm={() => onDelete(customer.id)}
    />
  )
}
