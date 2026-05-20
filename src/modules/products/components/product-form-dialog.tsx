"use client"

import { useState } from "react"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Pencil, X } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { PRODUCT_CATEGORIES } from "@/modules/products/services/data/categories"
import {
  productFormSchema,
  type Product,
  type ProductFormSchemaValues,
  type ProductFormValues,
} from "@/modules/products/services/types/product-types"

interface ProductFormDialogProps {
  onSave: (data: ProductFormValues) => void
  initialData?: Product | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProductFormDialog({
  onSave,
  initialData,
  open,
  onOpenChange,
}: ProductFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isEdit = !!initialData

  const isControlled = open !== undefined && onOpenChange !== undefined
  const dialogOpen = isControlled ? open : internalOpen
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen

  const form = useForm<ProductFormSchemaValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      price: initialData?.price ?? 0,
      description: initialData?.description ?? "",
      in_stock: initialData?.in_stock ?? true,
      categories: initialData?.categories ?? "",
      images: initialData?.images ?? [],
      discount: initialData?.discount ?? 0,
      tags: initialData?.tags ?? [],
    },
  })

  function onSubmit(data: ProductFormSchemaValues) {
    onSave({
      name: data.name,
      price: Number(data.price),
      description: data.description ?? "",
      in_stock: data.in_stock ?? true,
      categories: data.categories as ProductFormValues["categories"],
      images: data.images ?? [],
      discount: Number(data.discount ?? 0),
      tags: data.tags ?? [],
    })
    form.reset()
    setDialogOpen(false)
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Thêm sản phẩm
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin sản phẩm."
              : "Tạo sản phẩm mới. Các trường có dấu * là bắt buộc."}
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
                    Tên sản phẩm <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên sản phẩm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Giá (VND) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giảm giá (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Nhập mô tả sản phẩm..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Danh mục <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="cursor-pointer w-full">
                          <SelectValue placeholder="Chọn danh mục" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="in_stock"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Còn hàng
                      </FormLabel>
                      <FormDescription>
                        Sản phẩm có sẵn để bán
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL hình ảnh</FormLabel>
                  <ImageInput
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormDescription>
                    Thêm URL hình ảnh sản phẩm. Dán URL và nhấn Enter hoặc nhấn dấu + để thêm.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormDescription>
                    Nhấn Enter hoặc dấu + để thêm tag (ví dụ: new, sale, popular)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" className="cursor-pointer">
                {isEdit ? "Lưu thay đổi" : "Thêm sản phẩm"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function ImageInput({
  value,
  onChange,
}: {
  value: string[] | undefined
  onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState("")

  function addImage() {
    const trimmed = input.trim()
    if (trimmed && !(value ?? []).includes(trimmed)) {
      onChange([...(value ?? []), trimmed])
      setInput("")
    }
  }

  function removeImage(url: string) {
    onChange((value ?? []).filter((u) => u !== url))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="https://example.com/image.jpg"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addImage()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="cursor-pointer shrink-0"
          onClick={addImage}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {(value?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {(value ?? []).map((url) => (
            <div
              key={url}
              className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-sm"
            >
              <span className="truncate max-w-[200px]">{url}</span>
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="text-muted-foreground hover:text-destructive cursor-pointer"
                aria-label={`Xóa hình ảnh ${url}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TagInput({
  value,
  onChange,
}: {
  value: string[] | undefined
  onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState("")

  function addTag() {
    const trimmed = input.trim().toLowerCase()
    if (trimmed && !(value ?? []).includes(trimmed)) {
      onChange([...(value ?? []), trimmed])
      setInput("")
    }
  }

  function removeTag(tag: string) {
    onChange((value ?? []).filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Nhập tag và nhấn Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addTag()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="cursor-pointer shrink-0"
          onClick={addTag}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {(value?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {(value ?? []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-primary/60 hover:text-destructive cursor-pointer"
                aria-label={`Xóa tag ${tag}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
