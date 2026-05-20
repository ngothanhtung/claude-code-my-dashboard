import { z } from "zod"

export type ProductCategory =
  | "Electronics"
  | "Fashion"
  | "Home & Garden"
  | "Sports"
  | "Books"
  | "Toys"
  | "Health"
  | "Beauty"
  | "Automotive"
  | "Food"
  | "Other"

export interface Product {
  id: string
  name: string
  price: number
  description: string
  in_stock: boolean
  categories: ProductCategory
  images: string[]
  createdAt: string
  updatedAt: string
  discount: number
  tags: string[]
}

export interface ProductFormValues {
  name: string
  price: number
  description: string
  in_stock: boolean
  categories: ProductCategory
  images: string[]
  discount: number
  tags: string[]
}

export const productFormSchema = z.object({
  name: z.string().min(1, { message: "Tên sản phẩm là bắt buộc." }),
  price: z.number().min(0.01, { message: "Giá phải lớn hơn 0." }),
  description: z.string().optional(),
  in_stock: z.boolean().optional(),
  categories: z.string().min(1, { message: "Danh mục là bắt buộc." }),
  images: z.array(z.string()).optional(),
  discount: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
})

export type ProductFormSchemaValues = z.infer<typeof productFormSchema>
