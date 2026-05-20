"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Package } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "./delete-confirm-dialog"
import type { Product } from "@/modules/products/services/types/product-types"

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(price)
}

function getCategoryColor(category: string) {
  switch (category) {
    case "Electronics":
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20"
    case "Fashion":
      return "text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-900/20"
    case "Home & Garden":
      return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20"
    case "Sports":
      return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20"
    case "Books":
      return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20"
    case "Toys":
      return "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20"
    case "Health":
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
    case "Beauty":
      return "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-900/20"
    case "Automotive":
      return "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-900/20"
    case "Food":
      return "text-lime-600 bg-lime-50 dark:text-lime-400 dark:bg-lime-900/20"
    default:
      return "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20"
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
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
}

export function getColumns({ onEdit, onDelete }: GetColumnsOptions): ColumnDef<Product>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column} label="Sản phẩm" />,
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-md overflow-hidden">
              {product.images[0] ? (
                <AvatarImage src={product.images[0]} alt={product.name} className="object-cover" />
              ) : (
                <AvatarFallback className="rounded-md bg-muted">
                  <Package className="size-5 text-muted-foreground" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col max-w-[200px]">
              <span className="font-medium truncate">{product.name}</span>
              <span className="text-sm text-muted-foreground truncate">
                {product.description || "—"}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => <SortableHeader column={column} label="Giá" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{formatPrice(row.original.price)}</span>
          {row.original.discount > 0 && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(row.original.price / (1 - row.original.discount / 100))}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "discount",
      header: ({ column }) => <SortableHeader column={column} label="Giảm giá" />,
      cell: ({ row }) => {
        const discount = row.getValue("discount") as number
        if (discount <= 0) return <span className="text-muted-foreground">—</span>
        return (
          <Badge variant="destructive" className="font-medium">
            -{discount}%
          </Badge>
        )
      },
    },
    {
      accessorKey: "in_stock",
      header: ({ column }) => <SortableHeader column={column} label="Tình trạng" />,
      cell: ({ row }) => {
        const inStock = row.getValue("in_stock") as boolean
        return (
          <Badge
            variant={inStock ? "default" : "secondary"}
            className={inStock
              ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
            }
          >
            {inStock ? "Còn hàng" : "Hết hàng"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "categories",
      header: "Danh mục",
      cell: ({ row }) => {
        const category = row.getValue("categories") as string
        return (
          <Badge variant="secondary" className={getCategoryColor(category)}>
            {category}
          </Badge>
        )
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.getValue("tags") as string[]
        if (!tags || tags.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer"
              onClick={() => onEdit(product)}
            >
              <span className="sr-only">Sửa sản phẩm</span>
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
            <DeleteConfirmDialogWrapper product={product} onDelete={onDelete} />
          </div>
        )
      },
    },
  ]
}

function DeleteConfirmDialogWrapper({
  product,
  onDelete,
}: {
  product: Product
  onDelete: (id: string) => void
}) {
  return (
    <DeleteConfirmDialog
      productName={product.name}
      onConfirm={() => onDelete(product.id)}
    />
  )
}
