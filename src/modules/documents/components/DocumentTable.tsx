"use client"

import { useState } from "react"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, FileText, Trash2 } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Document } from "@/modules/documents/services/types/document-types"

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

interface SortableHeaderProps {
  column: {
    getIsSorted: () => false | "asc" | "desc"
    toggleSorting: (desc?: boolean) => void
  }
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
      className="-ml-3 h-8 cursor-pointer select-none p-0"
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
  onEdit: (doc: Document) => void
  onDelete?: (doc: Document) => void
}

export function getColumns({ onEdit, onDelete }: GetColumnsOptions): ColumnDef<Document>[] {
  return [
    {
      id: "stt",
      header: "STT",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {row.index + 1}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column} label="Tên tài liệu" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "summary",
      header: "Mô tả",
      cell: ({ row }) => {
        const summary = row.getValue("summary") as string
        return (
          <span className="text-muted-foreground text-sm max-w-xs truncate block">
            {summary || "—"}
          </span>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <SortableHeader column={column} label="Ngày tạo" />
      ),
      cell: ({ row }) => {
        const date = row.original.createdAt
        return (
          <span className="text-sm">{formatDate(date)}</span>
        )
      },
    },
    {
      accessorKey: "createdByName",
      header: ({ column }) => (
        <SortableHeader column={column} label="Người tạo" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("createdByName")}</span>
      ),
    },
    {
      accessorKey: "attachment",
      header: "File",
      cell: ({ row }) => {
        const attachment = row.original.attachment
        if (!attachment) return <span className="text-muted-foreground">—</span>
        return (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex"
          >
            <Badge
              variant="secondary"
              className="gap-1 font-normal cursor-pointer hover:bg-secondary/80"
            >
              <FileText className="size-3" />
              <span className="max-w-30 truncate">{attachment.name}</span>
            </Badge>
          </a>
        )
      },
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(row.original)
            }}
          >
            <span className="sr-only">Sửa tài liệu</span>
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
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row.original)
              }}
            >
              <span className="sr-only">Xóa tài liệu</span>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]
}

interface DocumentTableProps {
  documents: Document[]
  onEdit: (doc: Document) => void
  onDelete?: (doc: Document) => void
}

export function DocumentTable({ documents, onEdit, onDelete }: DocumentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility] = useState({})

  const columns: ColumnDef<Document>[] = getColumns({ onEdit, onDelete })

  const table = useReactTable({
    data: documents,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="w-full space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onEdit(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                  Chưa có tài liệu nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground hidden sm:block">
          Tổng: {table.getFilteredRowModel().rows.length} tài liệu
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2 hidden sm:block">
            <p className="text-sm font-medium">
              Trang {table.getState().pagination.pageIndex + 1} /{" "}
              {table.getPageCount()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="cursor-pointer"
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="cursor-pointer"
            >
              Sau
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
