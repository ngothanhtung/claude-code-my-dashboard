export type Gender = "Male" | "Female" | null

export type Category =
  | "Education"
  | "Sales"
  | "Marketing"
  | "Worker"
  | "Engineering"
  | "Healthcare"
  | "Finance"
  | "Legal"
  | "Other"

export interface Customer {
  id: string
  name: string
  category: Category
  address: string
  email: string
  phone: string
  gender: Gender
  notes: string
  createdAt: string
}

export interface CustomerFormValues {
  name: string
  category: Category
  address: string
  email: string
  phone: string
  gender: Gender
  notes: string
}
