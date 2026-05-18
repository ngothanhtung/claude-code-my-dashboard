import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  type DocumentReference,
} from "firebase/firestore"

import { db } from "@/lib/firebase/client"
import type { Customer } from "./types/customer-types"

const CUSTOMERS_COLLECTION = "customers"

export async function getCustomers(): Promise<Customer[]> {
  const snapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION))

  return snapshot.docs.map((document) => {
    const data = document.data() as Customer

    return {
      ...data,
      id: data.id ?? document.id,
    }
  })
}

export async function createCustomer(customer: Customer): Promise<Customer> {
  await setDoc(doc(db, CUSTOMERS_COLLECTION, customer.id), customer)

  return customer
}

export async function updateCustomer(customer: Customer): Promise<Customer> {
  const { id, ...data } = customer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, CUSTOMERS_COLLECTION, id) as DocumentReference<any>, data as any)

  return customer
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, CUSTOMERS_COLLECTION, id))
}
