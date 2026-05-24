# Tài liệu Đặc tả Kỹ thuật Chi tiết — Quản lý Tài liệu v1.0

**Ngày:** 2026-05-22
**Phiên bản:** 1.0
**Trạng thái:** Draft

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Cấu trúc dữ liệu](#2-cấu-trúc-dữ-liệu)
3. [Các thành phần & file](#3-các-thành-phần--file)
4. [Quy trình nghiệp vụ chi tiết](#4-quy-trình-nghiệp-vụ-chi-tiết)
5. [Thiết kế UI chi tiết](#5-thiết-kế-ui-chi-tiết)
6. [Firebase Operations](#6-firebase-operations)
7. [Xử lý file upload](#7-xử-lý-file-upload)
8. [Xử lý lỗi & rollback](#8-xử-lý-lỗi--rollback)
9. [Các quy ước & constraint](#9-các-quy-ước--constraint)
10. [Trạng thái hiện tại](#10-trạng-thái-hiện-tại)

---

## 1. Tổng quan

### 1.1 Mục tiêu

Xây dựng chức năng **Quản lý Tài liệu** cho phép người dùng xem danh sách, thêm mới, và chỉnh sửa tài liệu. Tài liệu được lưu trữ trên **Firebase Firestore** (metadata) và **Firebase Storage** (file đính kèm).

### 1.2 Phạm vi v1

- [x] Xem danh sách tài liệu
- [x] Thêm mới tài liệu
- [x] Chỉnh sửa tài liệu
- [ ] Xóa tài liệu (v2)

### 1.3 Phạm vi v2 — Xóa tài liệu

- [ ] Xóa tài liệu (kèm file đính kèm trên Storage)
- [ ] Confirm dialog trước khi xóa
- [ ] Toast thông báo thành công / thất bại

### 1.3 Dependencies đã có sẵn

Không cần cài đặt thêm bất kỳ package nào. Tất cả đều đã có trong `package.json`:

| Package | Phiên bản | Mục đích |
| --- | --- | --- |
| `firebase` | `^12.12.1` | Firestore + Storage + Auth |
| `@tanstack/react-table` | đã có | Bảng danh sách với sorting/pagination |
| `react-hook-form` | đã có | Form state management |
| `zod` | đã có | Schema validation |
| `@hookform/resolvers` | đã có | zodResolver integration |
| `sonner` | đã có | Toast notifications |
| `@radix-ui/react-progress` | đã có | Progress bar (thông qua shadcn/ui) |

---

## 2. Cấu trúc dữ liệu

### 2.1 TypeScript Interfaces

**File:** [src/modules/documents/services/types/document-types.ts](src/modules/documents/services/types/document-types.ts)

```typescript
// --- File constants ---
export const ALLOWED_FILE_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".png", ".jpg",
] as const

export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024 // 10_485_760

// --- Attachment (file metadata) ---
export interface DocumentAttachment {
  name: string   // Tên file gốc, để hiển thị và xóa
  url: string   // Firebase Storage download URL
  path: string  // Storage path, dùng để xóa file cũ
}

// --- Main document ---
export interface Document {
  id: string
  name: string              // Bắt buộc, max 255 ký tự
  summary: string           // Không bắt buộc, max 5000 ký tự
  attachment: DocumentAttachment | null
  createdAt: Date           // Server timestamp
  updatedAt: Date           // Server timestamp
  createdBy: string         // UID người tạo
  createdByName: string     // Display name người tạo (cache)
  updatedBy: string         // UID người cập nhật gần nhất
  updatedByName: string     // Display name người cập nhật (cache)
}

// --- Firestore document (raw data từ Firebase) ---
// Khác với Document ở chỗ createdAt/updatedAt là Timestamp/Firestore unknown
export interface DocumentFirestore {
  id: string
  name: string
  summary: string
  attachment: DocumentAttachment | null
  createdAt: unknown  // Firestore Timestamp hoặc Date
  updatedAt: unknown  // Firestore Timestamp hoặc Date
  createdBy: string
  createdByName: string
  updatedBy: string
  updatedByName: string
}

// --- Form validation schema ---
export const DocumentSchema = z.object({
  name: z
    .string()
    .min(1, "Tên tài liệu không được để trống")
    .max(255, "Tên tài liệu không được vượt quá 255 ký tự"),
  summary: z.string().max(5000).optional().default(""),
})

export type DocumentFormValues = z.infer<typeof DocumentSchema>
```

### 2.2 Firestore Schema

**Collection:** `documents`

| Field | Type | Required | Mô tả |
| --- | --- | --- | --- |
| `name` | string | Có | Tên tài liệu, max 255 ký tự |
| `summary` | string | Không | Mô tả tóm tắt, max 5000 ký tự |
| `attachment` | Map/null | Không | { name, url, path } |
| `createdAt` | Timestamp | Tự động | Server timestamp lúc tạo |
| `updatedAt` | Timestamp | Tự động | Server timestamp lúc cập nhật |
| `createdBy` | string | Tự động | UID người tạo |
| `createdByName` | string | Tự động | Display name người tạo |
| `updatedBy` | string | Tự động | UID người cập nhật |
| `updatedByName` | string | Tự động | Display name người cập nhật |

### 2.3 Firebase Storage Path

```
documents/{userId}/{documentId}/{fileName}
```

- `userId`: Lấy từ `auth.currentUser.uid`
- `documentId`: Firestore auto-generated ID (trước khi tạo document thì dùng chính ID này để upload file trước)
- `fileName`: Tên file gốc người dùng chọn

---

## 3. Các thành phần & file

### 3.1 Structure tổng thể

```
src/modules/documents/
├── components/
│   ├── DocumentList.tsx          # Container + layout wrapper
│   ├── DocumentTable.tsx         # Bảng danh sách (TanStack Table)
│   └── DocumentFormDialog.tsx     # Dialog tạo/sửa tài liệu
└── services/
    ├── document-services.ts        # CRUD operations + Firebase
    └── types/
        └── document-types.ts      # Types + Zod schema + constants

src/app/(private)/documents/
└── page.tsx                      # Route page — gồm tất cả state
```

### 3.2 Chi tiết từng file

#### 3.2.1 `document-types.ts` — Types & Validation

**File:** [src/modules/documents/services/types/document-types.ts](src/modules/documents/services/types/document-types.ts)

**Exports:**

```typescript
// Constants
ALLOWED_FILE_EXTENSIONS: readonly [".pdf",".doc",".docx",".xls",".xlsx",".txt",".png",".jpg"]
MAX_FILE_SIZE_MB: 10
MAX_FILE_SIZE_BYTES: 10485760

// Types
DocumentAttachment
Document
DocumentFirestore

// Schema & infer
DocumentSchema   // Zod schema (dùng cho validation)
DocumentFormValues // TypeScript type từ Zod
```

**Lưu ý:** `DocumentSchema` trong types là schema chuẩn dùng chung. Component `DocumentFormDialog` định nghĩa riêng `documentFormSchema` bên trong (cùng các rule nhưng có thể khác message).

#### 3.2.2 `document-services.ts` — CRUD Operations

**File:** [src/modules/documents/services/document-services.ts](src/modules/documents/services/document-services.ts)

**Exports:**

```typescript
getDocuments(): Promise<Document[]>
// Lấy toàn bộ documents, sort theo createdAt desc
// Fallback: trả về [] nếu Firestore lỗi

deleteDocument(id: string, attachmentPath?: string | null): Promise<void>
// Xóa Firestore document theo id
// Xóa file trên Storage (nếu có attachmentPath) — ignore lỗi nếu file không tồn tại

createDocument(
  data: DocumentFormValues,
  file?: File | null
): Promise<Document>
// Upload file nếu có -> tạo Firestore document
// Trả về Document đã tạo (id tự gen)

updateDocument(
  id: string,
  data: DocumentFormValues,
  file?: File | null,
  existingAttachment?: DocumentAttachment | null
): Promise<Document>
// Nếu có file mới: xóa file cũ (nếu có) -> upload file mới -> update
// Trả về Document đã update
```

**Nội dung chi tiết các hàm:**

**`getCurrentUser()`** — Helper lấy thông tin user hiện tại:

```typescript
function getCurrentUser() {
  const user = auth.currentUser
  return {
    uid: user?.uid ?? "",
    displayName: user?.displayName ?? user?.email ?? "Unknown",
  }
}
```

**`toDate(value: unknown): Date`** — Converter Timestamp -> Date:

```typescript
// Handle: Date instance, Firestore Timestamp object (có method toDate()), giá trị khác
// Trả về Date, hoặc new Date() nếu không parse được
```

**`firestoreToDocument(id, data)`** — Converter Firestore -> Document:

```typescript
// Chuyển createdAt/updatedAt từ Firestore Timestamp/Firestore unknown -> Date
// Trả về Document (frontend type)
```

**`getDocuments()`:**

```typescript
const q = query(collection(db, "documents"), orderBy("createdAt", "desc"))
const snapshot = await getDocs(q)
return snapshot.docs.map(d => firestoreToDocument(d.id, d.data()))
// Catch lỗi -> trả về [] (mock/fallback)
```

**`createDocument(data, file)`:**

```
1. Lấy uid, displayName từ getCurrentUser()
2. Nếu có file:
   a. Tạo docRef = doc(collection(db, "documents")) để lấy id
   b. Tính storagePath = "documents/${uid}/${docRef.id}/${file.name}"
   c. uploadBytes(storageRef, file)
   d. getDownloadURL(storageRef)
   e. attachment = { name, url, path }
3. Tạo payload với serverTimestamp() cho createdAt/updatedAt
4. setDoc(newDocRef, payload)
5. Trả về Document object (frontend-friendly, dates = new Date())
```

**`updateDocument(id, data, file, existingAttachment)`:**

```
1. Lấy uid, displayName từ getCurrentUser()
2. attachment = existingAttachment ?? null
3. Nếu có file mới:
   a. Nếu existingAttachment: xóa file cũ (deleteObject) — ignore lỗi
   b. Tính storagePath = "documents/${uid}/${id}/${file.name}"
   c. uploadBytes + getDownloadURL
   d. attachment = { name, url, path }
4. updateDoc(doc(db, "documents", id), {...data, attachment, updatedBy, updatedByName, updatedAt})
5. Trả về Document object
```

**`deleteDocument(id, attachmentPath)`:**

```text
1. Nếu có attachmentPath: xóa file trên Storage (deleteObject) — ignore lỗi
2. deleteDoc(doc(db, "documents", id))
3. Không cần trả về document (chỉ cần confirm thành công)
```

#### 3.2.3 `DocumentTable.tsx` — Bảng danh sách

**File:** [src/modules/documents/components/DocumentTable.tsx](src/modules/documents/components/DocumentTable.tsx)

**Props:**

```typescript
interface DocumentTableProps {
  documents: Document[]
  onEdit: (doc: Document) => void
  onDelete?: (doc: Document) => void  // v2 — optional, nếu chưa implement thì không truyền
}
```

**Column definitions** (hàm `getColumns({ onEdit, onDelete })` trả về `ColumnDef<Document>[]`):

| Cột | ID | Sorting | Cell |
| --- | --- | --- | --- |
| STT | `stt` | Không | `row.index + 1` |
| Tên tài liệu | `name` | Có | `<span className="font-medium">{name}</span>` |
| Mô tả | `summary` | Không | `truncate` 1 dòng, "—" nếu rỗng |
| Ngày tạo | `createdAt` | Có | `formatDate(date)` |
| Người tạo | `createdByName` | Có | plain text |
| File | `attachment` | Không | Badge icon link hoặc "—" |
| Thao tác | `actions` | Không | Button icon edit (+ icon delete nếu `onDelete` được truyền) |

**SortableHeader component** — Thay thế `DataTableColumnHeader` (từ tasks module), chỉ hỗ trợ toggle sorting (asc/desc/off), không có filter.

**Table features:**

- `getCoreRowModel` — Hiển thị cột
- `getPaginationRowModel` — Phân trang (pageSize mặc định = 10)
- `getSortedRowModel` — Sắp xếp
- Row click -> gọi `onEdit(row.original)` (cột Thao tác không trigger row click)
- Empty state: "Chưa có tài liệu nào."
- Pagination: "Tổng: N tài liệu" + nút Trang "X / Y" + Previous/Next

**Sorting logic chi tiết** (trong `SortableHeader.handleClick`):

```typescript
if (sorted === false)  -> toggleSorting(false)   // bắt đầu asc
else if (sorted === "asc")  -> toggleSorting(true)  // đổi thành desc
else  -> toggleSorting(undefined)  // bỏ sort
```

**Format date:**

```typescript
new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric",
}).format(date)  // "22/05/2026"
```

#### 3.2.4 `DocumentFormDialog.tsx` — Dialog tạo/sửa

**File:** [src/modules/documents/components/DocumentFormDialog.tsx](src/modules/documents/components/DocumentFormDialog.tsx)

**Props:**

```typescript
interface DocumentFormDialogProps {
  onSave: (data: DocumentFormValues, file?: File | null) => Promise<void>
  initialData?: Document | null  // undefined = tạo mới, Document = chỉnh sửa
  open?: boolean                  // Controlled mode
  onOpenChange?: (open: boolean) => void
}
```

**Controlled vs Uncontrolled pattern:**

```typescript
// Uncontrolled: Dialog tự quản lý open/close
const [internalOpen, setInternalOpen] = useState(false)

// Controlled: Parent truyền open/onOpenChange
const isControlled = open !== undefined && onOpenChange !== undefined
const dialogOpen = isControlled ? open : internalOpen
const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen

// isEdit: true khi initialData tồn tại
const isEdit = !!initialData
```

**Form:**

- Local schema (bên trong component, khác với DocumentSchema ở types):
  ```typescript
  const documentFormSchema = z.object({
    name: z.string().min(1, "Tên tài liệu không được để trống").max(255),
    summary: z.string().max(5000),
  })
  ```
- Default values: `name: initialData?.name ?? ""`, `summary: initialData?.summary ?? ""`
- Sử dụng `useForm` + `zodResolver`

**File handling:**

- `selectedFile: File | null` — File mới người dùng chọn (chưa upload)
- `existingFileName: string | null` — Tên file đã có trên Storage (từ initialData)
- Hiển thị file đã chọn: `FileBadge` component (icon + tên + kích thước)
- Nút "Xóa file": đặt `selectedFile=null`, `existingFileName=null`
- File input là invisible overlay trên div dashed border
- `accept={ALLOWED_FILE_EXTENSIONS.join(",")}` — Giới hạn browser file picker

**Upload progress:**

- `isUploading: boolean` — Trạng thái submit (hiển thị progress + disable form)
- `uploadProgress: number` (0-100)
- `simulateProgress()` — Fake progress từ 0% đến 90% (uploadBytes không có callback progress, nên dùng fake)
- Sau khi submit thành công: `uploadProgress = 100`
- Progress bar: `<Progress value={uploadProgress} />`

**Submit flow (`onSubmit`):**

```typescript
async function onSubmit(data: DocumentFormSchemaValues) {
  setIsUploading(true)
  setUploadProgress(0)

  // Bắt đầu fake progress nếu có file
  let cleanup: (() => void) | undefined
  if (selectedFile) {
    cleanup = simulateProgress()
  }

  try {
    // Gọi parent callback (page.tsx xử lý Firebase)
    await onSave({ name: data.name, summary: data.summary ?? "" }, selectedFile)
    setUploadProgress(100)
    form.reset()
    setSelectedFile(null)
    setExistingFileName(initialData?.attachment?.name ?? null)
    setDialogOpen(false)
  } catch {
    toast.error("Đã xảy ra lỗi. Vui lòng thử lại.")
    throw // Re-throw để parent biết thất bại
  } finally {
    cleanup?.()
    setIsUploading(false)
    setUploadProgress(0)
  }
}
```

**Reset on close:**

```typescript
function handleOpenChange(open: boolean) {
  if (!open) {
    form.reset({ name: initialData?.name ?? "", summary: initialData?.summary ?? "" })
    setSelectedFile(null)
    setExistingFileName(initialData?.attachment?.name ?? null)
    setUploadProgress(0)
    setIsUploading(false)
  }
  setDialogOpen(open)
}
```

**Dialog title:**

- Tạo mới: "Thêm tài liệu mới"
- Chỉnh sửa: "Chỉnh sửa tài liệu"

**Dialog trigger:** Chỉ render `DialogTrigger` khi `!isEdit` (lần đầu mở dialog thì dùng trigger, lúc chỉnh sửa thì truyền `open` controlled từ parent).

#### 3.2.5 `DocumentList.tsx` — Container

**File:** [src/modules/documents/components/DocumentList.tsx](src/modules/documents/components/DocumentList.tsx)

**Props:**

```typescript
interface DocumentListProps {
  documents: Document[]
  isLoading: boolean
  editingDocument: Document | null
  isEditDialogOpen: boolean
  onEdit: (doc: Document) => void
  onAdd: (data: DocumentFormValues) => Promise<void>
  onUpdate: (data: DocumentFormValues, file?: File | null) => Promise<void>
  onEditDialogOpenChange: (open: boolean) => void
  deletingDocument: Document | null  // v2 — document đang chờ confirm delete
  onDelete: (doc: Document) => void  // v2 — mở confirm dialog
  onConfirmDelete: () => Promise<void>  // v2 — thực hiện xóa
  onDeleteDialogOpenChange: (open: boolean) => void  // v2
}
```

**Nội dung:**

- Tiêu đề trang: "Quản lý Tài liệu"
- Mô tả: "Danh sách và quản lý tài liệu"
- Nút "Thêm tài liệu" (via `DocumentFormDialog` uncontrolled mode)
- Thông tin số lượng: "X tài liệu" hoặc "Đang tải..."
- Table: `<DocumentTable documents={documents} onEdit={onEdit} onDelete={onDelete} />`
- Edit dialog: `<DocumentFormDialog initialData={editingDocument} ... />` (chỉ render khi `editingDocument !== null`)
- v2 — Delete dialog: `<AlertDialog open={deletingDocument !== null} onOpenChange={onDeleteDialogOpenChange}>...</AlertDialog>`

**Layout:**

```tsx
<div className="flex flex-col gap-4">
  <div className="@container/main px-4 lg:px-6">
    {/* Tiêu đề + mô tả */}
  </div>
  <div className="@container/main px-4 lg:px-6">
    {/* Nút + bảng */}
  </div>
</div>
```

#### 3.2.6 `documents/page.tsx` — Route page

**File:** [src/app/(private)/documents/page.tsx](src/app/(private)/documents/page.tsx)

**State management (local state, không dùng Zustand/Context):**

```typescript
const [documents, setDocuments] = useState<Document[]>([])
const [editingDocument, setEditingDocument] = useState<Document | null>(null)
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
const [isLoading, setIsLoading] = useState(true)
```

**v2 — Delete state:**

```typescript
const [deletingDocument, setDeletingDocument] = useState<Document | null>(null)
```

**Load data on mount:**

```typescript
useEffect(() => {
  getDocuments()
    .then(setDocuments)
    .catch(() => toast.error("Không thể tải danh sách tài liệu."))
    .finally(() => setIsLoading(false))
}, [])
```

**`handleAdd`:**

```typescript
async function handleAdd(data: DocumentFormValues, file?: File | null) {
  toast.loading("Đang thêm tài liệu...")
  try {
    const newDoc = await createDocument(data, file ?? null)
    setDocuments(prev => [newDoc, ...prev]) // prepend vì sort desc
    toast.success("Thêm tài liệu thành công.")
  } catch {
    toast.error("Thêm tài liệu thất bại. Vui lòng thử lại.")
    throw new Error("Create failed") // Re-throw để dialog biết
  }
}
```

**`handleUpdate`:**

```typescript
async function handleUpdate(data: DocumentFormValues, file?: File | null) {
  if (!editingDocument) return
  toast.loading("Đang cập nhật tài liệu...")
  try {
    const updated = await updateDocument(
      editingDocument.id, data, file ?? null, editingDocument.attachment
    )
    setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d))
    setEditingDocument(null)
    setIsEditDialogOpen(false)
    toast.success("Cập nhật tài liệu thành công.")
  } catch {
    toast.error("Cập nhật tài liệu thất bại. Vui lòng thử lại.")
    throw new Error("Update failed")
  }
}
```

**`handleEdit`:**

```typescript
function handleEdit(doc: Document) {
  setEditingDocument(doc)
  setIsEditDialogOpen(true)
}
```

**`handleDelete` — v2:**

```typescript
async function handleDelete(doc: Document) {
  setDeletingDocument(doc)  // mở confirm dialog
}

async function confirmDelete() {
  if (!deletingDocument) return
  toast.loading("Đang xóa tài liệu...")
  try {
    await deleteDocument(deletingDocument.id, deletingDocument.attachment?.path ?? null)
    setDocuments(prev => prev.filter(d => d.id !== deletingDocument.id))
    setDeletingDocument(null)
    toast.success("Xóa tài liệu thành công.")
  } catch {
    toast.error("Xóa tài liệu thất bại. Vui lòng thử lại.")
  }
}
```

---

## 4. Quy trình nghiệp vụ chi tiết

### 4.1 Xem danh sách

```
1. documents/page.tsx mount
2. Gọi getDocuments() -> Firestore query "documents" orderBy createdAt desc
3. Chuyển Firestore Timestamp -> Date
4. Set vào state -> hiển thị DocumentTable
5. Pagination: mặc định 10 dòng/trang, Previous/Next
6. Sorting: click cột "Tên tài liệu", "Ngày tạo", "Người tạo" -> toggle asc/desc
```

### 4.2 Thêm mới tài liệu

```
1. Người dùng nhấn "Thêm tài liệu" (DialogTrigger)
2. Mở DocumentFormDialog (uncontrolled)
3. Nhập tên (bắt buộc), mô tả (optional), chọn file (optional)
4. Nhấn "Thêm tài liệu"
   a. Form validate (Zod): name không trống, max 255
   b. File validate: định dạng + kích thước
   c. isUploading = true, progress chạy
   d. Gọi handleAdd(data, file)
      - toast.loading()
      - createDocument(data, file)
        * upload file lên Storage (nếu có)
        * setDoc() Firestore
        * trả về Document
      - prepend vào state
      - toast.success()
   e. Dialog đóng, form reset
   f. Nếu lỗi: toast.error(), re-throw
5. isUploading = false, progress = 0
```

### 4.3 Chỉnh sửa tài liệu

```
1. Click row bất kỳ trong bảng
2. setEditingDocument(doc), setIsEditDialogOpen(true)
3. Mở DocumentFormDialog (controlled, initialData = doc)
   - Form pre-fill: name, summary
   - existingFileName = doc.attachment?.name
4. Chỉnh sửa, chọn file mới hoặc xóa file
5. Nhấn "Lưu thay đổi"
   a. Form validate
   b. File validate (nếu chọn file mới)
   c. isUploading = true
   d. Gọi handleUpdate(data, file)
      - toast.loading()
      - updateDocument(id, data, file, existingAttachment)
        * Nếu có file mới:
          - deleteObject file cũ (nếu có) — ignore lỗi
          - uploadBytes file mới
          - getDownloadURL
        * updateDoc() Firestore
        * trả về Document
      - map state với document mới
      - đóng dialog
      - toast.success()
   e. Dialog đóng
   f. Nếu lỗi: toast.error(), re-throw
```

### 4.4 Xóa tài liệu (v2)

```
1. User click icon delete trên row tương ứng
2. Hiển thị confirm dialog: "Bạn có chắc muốn xóa tài liệu '{name}' không?"
3. User xác nhận:
   a. toast.loading("Đang xóa tài liệu...")
   b. Gọi deleteDocument(id, attachment?.path)
      - Xóa file trên Storage (nếu có) — ignore lỗi
      - deleteDoc() Firestore
   c. Xóa khỏi state (filter ra khỏi mảng)
   d. toast.success("Xóa tài liệu thành công.")
4. Nếu user hủy: đóng dialog, không làm gì
5. Nếu lỗi: toast.error("Xóa tài liệu thất bại. Vui lòng thử lại.")
```

---

## 5. Thiết kế UI chi tiết

### 5.1 Trang chính

```
+----------------------------------------------------------+
|  [Sidebar]                                               |
|                                                           |
|  Quản lý Tài liệu                              [icon]     |
|  Danh sách và quản lý tài liệu                           |
|                                                           |
|  +----------------------------------------------------+  |
|  | 3 tài liệu                          [+ Thêm tài liệu]|  |
|  |----------------------------------------------------|  |
|  | # | Tên tài liệu | Mô tả   | Ngày tạo | Người tạo |  |
|  |---|--------------|-----------|----------|-----------|  |
|  | 1 | Hợp đồng...  | Tóm tắt...| 22/05/26 | Nguyen A. |  |
|  | 2 | Báo cáo...   | ...       | 21/05/26 | Trần B.   |  |
|  |----------------------------------------------------|  |
|  | Tổng: 2 tài liệu                                     |  |
|  | Trang 1 / 1   [Trước]  [Sau]                        |  |
|  +----------------------------------------------------+  |
+----------------------------------------------------------+
```

### 5.2 Dialog Thêm mới

```
+-----------------------------------------------+
| Thêm tài liệu mới                    [X]     |
| Tạo tài liệu mới. Các trường có dấu * là bắt buộc. |
|                                               |
| Tên tài liệu *                                |
| [________________________]                    |
| "Tên tài liệu không được để trống" (nếu lỗi) |
|                                               |
| Mô tả tóm tắt                                 |
| [________________________]                    |
| [________________________]                    |
| [________________________]                    |
| [________________________]                    |
|                                               |
| File đính kèm                                |
| +------------------------------------------+ |
| |  [Chọn file...]  (dashed border)        | |
| +------------------------------------------+ |
| "Định dạng: .pdf, .doc, .docx, ... Tối đa 10MB." |
|                                               |
| [Hủy]                          [Thêm tài liệu] |
+-----------------------------------------------+
```

### 5.3 Dialog Chỉnh sửa (có file)

```
+-----------------------------------------------+
| Chỉnh sửa tài liệu                   [X]     |
| Cập nhật thông tin tài liệu.                   |
|                                               |
| Tên tài liệu *                                |
| [Hợp đồng lao động ABC________]               |
|                                               |
| Mô tả tóm tắt                                 |
| [Hợp đồng với nhân viên...]                   |
|                                               |
| File đính kèm                                |
| +------------------------------------------+ |
| | [PDF icon] hopdong.pdf     2.3MB  [Xóa] | |
| +------------------------------------------+ |
| (nếu xóa -> hiển thị dashed border chọn file)|
|                                               |
| [Hủy]                          [Lưu thay đổi] |
+-----------------------------------------------+
```

### 5.4 Các className & styling

- Dialog content: `sm:max-w-xl max-h-[90vh] overflow-y-auto`
- File input overlay: `absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10`
- File drop zone: `border-dashed border-muted-foreground/30 px-4 py-6`
- Table row: `cursor-pointer` (trigger edit on click)
- File badge: `rounded-md border bg-muted/50 px-3 py-2 text-sm`
- Progress: `h-2` (có sẵn trong Progress component)

### 5.5 Dialog Xác nhận Xóa (v2)

```text
+-----------------------------------------------+
| Xóa tài liệu                         [X]     |
|                                               |
| Bạn có chắc muốn xóa tài liệu               |
| "Hợp đồng lao động ABC" không?              |
| Hành động này không thể hoàn tác.           |
|                                               |
| [Hủy]                          [Xóa tài liệu] |
+-----------------------------------------------+
```

> **Ghi chú:** Dùng `AlertDialog` (từ `@radix-ui/react-alert-dialog`, có sẵn trong shadcn/ui) thay vì Dialog thông thường cho confirm. Nút "Xóa tài liệu" nên có `variant="destructive"`.

---

## 6. Firebase Operations

### 6.1 Import pattern

```typescript
// Chỉ import các thành phần cần thiết
import { auth, db, storage } from "@/lib/firebase/client"
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc,
         query, orderBy, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
```

### 6.2 Firestore operations

**Query (getDocuments):**

```typescript
const q = query(
  collection(db, "documents"),
  orderBy("createdAt", "desc")
)
const snapshot = await getDocs(q)
```

**Create (createDocument):**

```typescript
await setDoc(doc(collection(db, "documents")), {
  name: data.name,
  summary: data.summary ?? "",
  attachment,
  createdBy: uid,
  createdByName: displayName,
  updatedBy: uid,
  updatedByName: displayName,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})
```

**Update (updateDocument):**

```typescript
await updateDoc(doc(db, "documents", id), {
  name: data.name,
  summary: data.summary ?? "",
  attachment,
  updatedBy: uid,
  updatedByName: displayName,
  updatedAt: serverTimestamp(),
})
```

**Delete (deleteDocument) — v2:**

```typescript
await deleteDoc(doc(db, "documents", id))
```

### 6.3 Storage operations

**Upload:**

```typescript
const storagePath = `documents/${uid}/${docId}/${fileName}`
const storageRef = ref(storage, storagePath)
await uploadBytes(storageRef, file)
const url = await getDownloadURL(storageRef)
```

**Delete (updateDocument, khi replace file cũ):**

```typescript
if (existingAttachment) {
  try {
    const oldRef = ref(storage, existingAttachment.path)
    await deleteObject(oldRef)
  } catch {
    // File có thể đã bị xóa; ignore
  }
}
```

### 6.4 Auth pattern

```typescript
// Lấy trong document-services.ts
import { auth } from "@/lib/firebase/client"

function getCurrentUser() {
  const user = auth.currentUser
  return {
    uid: user?.uid ?? "",
    displayName: user?.displayName ?? user?.email ?? "Unknown",
  }
}
```

---

## 7. Xử lý file upload

### 7.1 File validation (client-side)

**Định dạng** (check extension):

```typescript
const ext = "." + file.name.split(".").pop()?.toLowerCase()
if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
  toast.error("Định dạng không được hỗ trợ.")
  return
}
```

**Kích thước**:

```typescript
if (file.size > MAX_FILE_SIZE_BYTES) { // 10MB
  toast.error("Kích thước file vượt quá 10MB.")
  return
}
```

### 7.2 File validation (browser)

```html
<input type="file" accept={ALLOWED_FILE_EXTENSIONS.join(",")} />
```

### 7.3 Progress bar

Vì Firebase SDK `uploadBytes` không có callback progress, progress bar là **fake**. Logic:

```typescript
function simulateProgress() {
  let progress = 0
  const interval = setInterval(() => {
    progress += Math.random() * 15 + 5
    if (progress >= 90) {
      clearInterval(interval)
      setUploadProgress(90) // dừng ở 90% cho đến khi upload xong
    } else {
      setUploadProgress(progress)
    }
  }, 200)
  return () => clearInterval(interval)
}

// Sau khi submit thành công:
setUploadProgress(100)
// finally block cleanup
```

### 7.4 File state machine

```
                    Chọn file mới
Dashed border  -------------------->  FileBadge (file mới)
       ^                                     |
       |                                     | Click "Xóa file"
       +-------------------------------------+
                                                  |
                                                  v
                                        existingFileName = null
                                                  |
                                                  v
                                          Dashed border (có file cũ)
                                                  |
                                                  v
                                        FileBadge (file cũ)
```

### 7.5 File path trong update

Khi update có file mới, storage path cho file cũ:

```typescript
// Path cũ: existingAttachment.path (lưu từ lúc upload trước)
// Path mới: `documents/${uid}/${id}/${file.name}`
```

---

## 8. Xử lý lỗi & rollback

### 8.1 Error handling

**getDocuments():**

```typescript
try {
  const snapshot = await getDocs(q)
  return snapshot.docs.map(...)
} catch {
  return [] // Fallback về mảng rỗng
}
```

**createDocument():**

```typescript
// Không có rollback vì chưa tạo document khi upload thất bại
// Nếu upload file -> tạo document
// Nếu thất bại giữa chừng: Firebase transaction sẽ tự rollback
```

**updateDocument():**

```typescript
// Xóa file cũ: ignore lỗi (file có thể đã bị xóa)
// Upload file mới: nếu thất bại -> không update Firestore
// Update Firestore: nếu thất bại -> file đã upload nhưng không có metadata (cần cleanup thủ công)
```

### 8.2 Toast messages

| Action | Success | Error |
| --- | --- | --- |
| Load danh sách | — | "Không thể tải danh sách tài liệu." |
| Thêm mới | "Thêm tài liệu thành công." | "Thêm tài liệu thất bại. Vui lòng thử lại." |
| Chỉnh sửa | "Cập nhật tài liệu thành công." | "Cập nhật tài liệu thất bại. Vui lòng thử lại." |
| Xóa (v2) | "Xóa tài liệu thành công." | "Xóa tài liệu thất bại. Vui lòng thử lại." |
| File validation | `toast.error` với message cụ thể |

---

## 9. Các quy ước & constraint

### 9.1 File naming & exports

- Components: `PascalCase.tsx` (VD: `DocumentTable.tsx`)
- Services: `kebab-case.ts` (VD: `document-services.ts`)
- Types: `document-types.ts`
- Exported function names: `camelCase` (VD: `createDocument`, `getDocuments`)

### 9.2 Import paths

```typescript
// Firebase
import { auth, db, storage } from "@/lib/firebase/client"

// Types
import type { Document, DocumentFormValues } from "@/modules/documents/services/types/document-types"
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "@/modules/documents/services/types/document-types"

// Services
import { createDocument, deleteDocument, getDocuments, updateDocument } from "@/modules/documents/services/document-services"

// Components
import { DocumentList } from "@/modules/documents/components/DocumentList"
import { DocumentTable } from "@/modules/documents/components/DocumentTable"
import { DocumentFormDialog } from "@/modules/documents/components/DocumentFormDialog"

// UI components
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, ... } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Toast
import { toast } from "sonner"

// Utils
import { cn } from "@/lib/utils"

// Icons (lucide-react)
import { FileText, Paperclip, Upload, X, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
```

### 9.3 State management

- Route page (`documents/page.tsx`): Quản lý tất cả state bằng `useState`
- DocumentList: Props-based, không có state nội bộ
- DocumentTable: Chỉ nhận props, không có state (chỉ có local useState cho sorting/pagination)
- DocumentFormDialog: Có local state (selectedFile, uploadProgress, isUploading, existingFileName)

### 9.4 Routing

- URL: `/documents`
- Route group: `(private)` — cần đăng nhập Firebase Auth
- Sidebar navigation: **Chưa có** item "Tài liệu" (cần thêm vào `app-sidebar.tsx` nav data)
- Layout: Sử dụng `SidebarInset` như các trang khác

### 9.5 Column visibility & features

| Feature | Hỗ trợ | Ghi chú |
| --- | --- | --- |
| Sort asc/desc | Có | Cột STT, File, Mô tả, Thao tác không sort |
| Pagination | Có | 10 dòng/trang, Previous/Next |
| Search | Không | v2 |
| Filter | Không | v2 |
| Row selection | Không | |
| Column visibility toggle | Không | |
| Empty state | Có | "Chưa có tài liệu nào." |
| Xóa tài liệu | Không | v2 |

### 9.6 Những thứ sẽ không làm

- Phân quyền theo user
- Tìm kiếm / lọc
- Preview file trong trình duyệt
- Quản lý phiên bản tài liệu
- Chia sẻ tài liệu

---

## 10. Trạng thái hiện tại

### 10.1 Tất cả 6 file đã implement đầy đủ

| STT | File | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| 1 | [document-types.ts](src/modules/documents/services/types/document-types.ts) | Hoàn thành | Types + Zod schema + constants |
| 2 | [document-services.ts](src/modules/documents/services/document-services.ts) | Hoàn thành | CRUD + Storage + Firestore |
| 3 | [DocumentTable.tsx](src/modules/documents/components/DocumentTable.tsx) | Hoàn thành | TanStack Table + sorting + pagination |
| 4 | [DocumentFormDialog.tsx](src/modules/documents/components/DocumentFormDialog.tsx) | Hoàn thành | Dialog form + file upload + progress |
| 5 | [DocumentList.tsx](src/modules/documents/components/DocumentList.tsx) | Hoàn thành | Container + layout |
| 6 | [documents/page.tsx](src/app/(private)/documents/page.tsx) | Hoàn thành | Route + state + handlers |

### 10.2 Checklist tất cả tính năng

- [x] Load danh sách từ Firestore
- [x] Sort theo cột (Tên, Ngày tạo, Người tạo)
- [x] Pagination (10/trang)
- [x] Empty state
- [x] Thêm mới tài liệu (Dialog + form + file upload)
- [x] Chỉnh sửa tài liệu (Dialog pre-fill + file replace)
- [x] File upload validation (format + size)
- [x] Fake upload progress bar
- [x] Toast notifications (loading, success, error)
- [x] createdBy/updatedBy từ auth.currentUser
- [x] createdAt/updatedAt serverTimestamp
- [x] File replace on update (xóa cũ, upload mới)
- [x] Fallback empty array khi Firestore lỗi
- [x] Reset form khi đóng dialog
- [ ] Xóa tài liệu kèm file Storage (v2)
- [ ] Confirm dialog trước khi xóa (v2)

### 10.3 Việc còn lại để hoàn thiện

- [ ] Thêm "Tài liệu" vào sidebar navigation (`src/components/app-sidebar.tsx`)
- [ ] Thêm `<Toaster />` vào root layout nếu chưa có (sonner cần Toaster render trong DOM)
- [ ] Implement xóa tài liệu (v2): `deleteDocument()` trong services, icon delete trên bảng, confirm dialog
- [ ] Viết unit tests (nếu cần)

### 10.4 Lệnh chạy

```bash
npm run dev      # Dev server
npm run build    # Production build
npm run lint     # ESLint
```

Truy cập: `http://localhost:3000/documents`
