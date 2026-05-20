import {
  collection,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  type DocumentReference,
} from "firebase/firestore"

import { db } from "@/lib/firebase/client"
import { getFirestoreCollection } from "@/lib/firebase/firestore-query"
import mockProducts from "./data/products.json"
import type { Product } from "./types/product-types"

const PRODUCTS_COLLECTION = "products"

export async function getProducts(): Promise<Product[]> {
  return getFirestoreCollection<Product>(PRODUCTS_COLLECTION, mockProducts as Product[])
}

export async function createProduct(product: Product): Promise<Product> {
  await setDoc(doc(db, PRODUCTS_COLLECTION, product.id), product)
  return product
}

export async function updateProduct(product: Product): Promise<Product> {
  const { id, ...data } = product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id) as DocumentReference<any>, data as any)
  return product
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, id))
}

export function generateId(): string {
  return `prod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
