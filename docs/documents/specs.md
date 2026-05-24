# Tài liệu Đặc tả Nghiệp vụ - Quản lý Tài liệu v1.0

**Ngay:** 2026-05-22
**Phien ban:** 1.0
**Trang thai:** Draft

---

## 1. Tong quan

### 1.1 Mục tiêu

Xây dựng chức năng **Quản lý Tài liệu** cho phép người dùng xem danh sách, thêm mới, và chỉnh sửa tài liệu. Tài liệu được lưu trữ trên **Firebase Firestore** (metadata) và **Firebase Storage** (file đính kèm).

### 1.2 Phạm vi v1

- Xem danh sách tài liệu
- Thêm mới tài liệu
- Chỉnh sửa tài liệu
- Xóa tài liệu (chưa có, dành cho v2)

---

## 2. Cấu trúc dữ liệu

### 2.1 Firestore Schema

**Collection:** `documents`

```typescript
interface Document {
  id: string; // Firestore auto-generated ID
  name: string; // Tên tài liệu, bắt buộc, max 255 ký tự
  summary: string; // Mô tả tóm tắt, multiline, không bắt buộc
  attachment: {       // Map, null nếu chưa upload
    name: string      // Tên file gốc, để hiển thị và xóa
    url: string       // URL Firebase Storage
    path: string      // Storage path, dùng để xóa file cũ
  }
  createdAt: Timestamp; // Thời điểm tạo (server timestamp)
  updatedAt: Timestamp; // Thời điểm cập nhật (server timestamp)
  createdBy: string; // UID của người tạo
  createdByName: string; // Display name người tạo (cache)
  updatedBy: string; // UID người cập nhật gần nhất
  updatedByName: string; // Display name người cập nhật (cache)
}
```

### 2.2 Đường dẫn Firebase Storage

```text
documents/{userId}/{documentId}/{fileName}
```

### 2.3 Validation (Zod Schema)

```typescript
const DocumentSchema = z.object({
  name: z.string().min(1, 'Tên tài liệu không được để trống').max(255),
  summary: z.string().max(5000).optional().default(''),
});

type DocumentFormValues = z.infer<typeof DocumentSchema>;
```

---

## 3. Quy trình nghiệp vụ

### 3.1 Danh sách tài liệu

- Load toàn bộ documents từ Firestore, sắp xếp theo `createdAt` giảm dần (mới nhất trước)
- Mỗi row hiển thị: tên, summary (preview 1 dòng), ngày tạo, người tạo, file đính kèm (badge icon)
- Click row -> mở dialog chỉnh sửa
- Nút "Thêm mới" ở trên cùng -> mở dialog tạo mới

### 3.2 Thêm mới tài liệu

1. User nhấn "Thêm mới"
2. Mở Dialog (DocumentFormDialog) với form: Tên (input), Mô tả (textarea), File đính kèm (file input), hiển thị "Thêm Tài liệu"
3. Validate form (Zod)
4. Upload file lên Firebase Storage (nếu có) -> lấy download URL
5. Ghi document vào Firestore với `createdAt`, `updatedAt`, `createdBy`, `updatedBy` lấy từ `auth.currentUser`
6. Đóng dialog, reload danh sách, hiển thị toast thành công

> **Lưu ý:** DocumentFormDialog là một component dùng chung cho cả 2 tác vụ Thêm mới và Chỉnh sửa. Tác vụ phân biệt qua props `initialData`:

- `initialData = undefined` -> chế độ "Thêm mới"
- `initialData = Document` -> chế độ "Chỉnh sửa"

### 3.3 Chỉnh sửa tài liệu

1. User click row bất kỳ trong danh sách
2. Mở Dialog (DocumentFormDialog) pre-fill với dữ liệu hiện tại, hiển thị "Chỉnh sửa Tài liệu"
3. Nếu upload file mới: xóa file cũ trên Storage -> upload file mới -> cập nhật URL
4. Update Firestore document với `updatedAt`, `updatedBy` mới
5. Đóng dialog, reload danh sách, hiển thị toast thành công

---

## 4. Thiết kế UI

### 4.1 Vị trí

```text
src/app/(private)/documents/page.tsx    -- trang chính
src/modules/documents/
  components/
    DocumentList.tsx               -- wrapper danh sách + nút thêm mới
    DocumentTable.tsx               -- TanStack Table
    DocumentFormDialog.tsx          -- Dialog thêm/sửa
  services/
    types/
      document-types.ts           -- Zod schema + TypeScript types
    document-services.ts            -- CRUD functions + storage helpers
```

### 4.2 Layout trang

```text
[Tiêu đề: "Quản lý Tài liệu"]           [+ Thêm mới]

# | Tên          | Mô tả       | Ngày tạo | Người tạo | File
1 | Hợp đồng...  | Tóm tắt...  | 22/05/26 | Nguyễn A.  | [icon]
2 | Báo cáo...   | ...          | 21/05/26 | Trần B.    | --
```

### 4.3 Dialog Form

```text
[Thêm / Chỉnh sửa Tài liệu]         [X]

Tên tài liệu *
[________________________]

Mô tả tóm tắt
[________________________]
[________________________]

File đính kèm
[Chọn file...]  [PDF: hopdong.pdf, 2.3MB]
(Định dạng: PDF, DOC, DOCX, XLS, XLSX)

                            [Hủy]  [Lưu]
```

---

## 5. Thiết kế kỹ thuật

### 5.1 Dependencies sử dụng

- `firebase` (đã cài sẵn `^12.12.1`)
- `@tanstack/react-table` (đã cài sẵn - dùng pattern từ tasks/customers)
- `react-hook-form` + `zod` + `@hookform/resolvers` (pattern có sẵn trong form shadcn/ui)
- `sonner` (toast - có sẵn trong codebase)

### 5.2 Auth Pattern cho createdBy/updatedBy

Lấy `auth.currentUser` từ `src/lib/firebase/client.ts` (đã export `auth`):

```typescript
import { auth } from '@/lib/firebase/client';
import { serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const currentUser = auth.currentUser;
const createdBy = currentUser?.uid ?? '';
const createdByName = currentUser?.displayName ?? currentUser?.email ?? 'Unknown';
```

### 5.3 Thao tác Storage

```typescript
// Upload
const storageRef = ref(storage, `documents/${userId}/${docId}/${fileName}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);

// Delete
const fileRef = ref(storage, attachment.path);
await deleteObject(fileRef);
```

### 5.4 Thao tác Firestore

```typescript
// Create
await setDoc(doc(db, 'documents', docId), {
  ...data,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  createdBy: uid,
  createdByName,
  updatedBy: uid,
  updatedByName,
});

// Update
await updateDoc(doc(db, 'documents', docId), {
  ...data,
  updatedAt: serverTimestamp(),
  updatedBy: uid,
  updatedByName,
});
```

### 5.5 Một số lưu ý

- **Upload progress:** Hiển thị progress bar khi upload file lên Storage
- **Xử lý lỗi:** Nếu upload thất bại -> rollback (xóa document đã tạo, hiển thị lỗi)
- **Định dạng file cho phép:** `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.txt`, `.png`, `.jpg`
- **Kích thước tối đa:** 10MB
- **Mock data:** Khi Firestore không khả dụng, fallback về mảng rỗng

---

## 6. Component Checklist

| STT | File                                                    | Mô tả                                 |
| --- | ------------------------------------------------------- | ------------------------------------- |
| 1   | src/modules/documents/services/types/document-types.ts  | Zod schema + TypeScript interface     |
| 2   | src/modules/documents/services/document-services.ts     | CRUD + storage helpers                |
| 3   | src/modules/documents/components/DocumentTable.tsx      | TanStack Table, click row -> edit     |
| 4   | src/modules/documents/components/DocumentFormDialog.tsx | Dialog form với react-hook-form + Zod |
| 5   | src/modules/documents/components/DocumentList.tsx       | Wrapper page component                |
| 6   | src/app/(private)/documents/page.tsx                    | Route page - use client               |

---

## 7. Ngoài phạm vi (v1)

- Xóa tài liệu (v2)
- Phân quyền tài liệu theo user (v2)
- Tìm kiếm / lọc (v2)
- Preview file trong trình duyệt (v2)
- Quản lý phiên bản tài liệu (v3)
- Chia sẻ tài liệu (v3)
