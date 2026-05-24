import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore"
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage"

import { auth, db, storage } from "@/lib/firebase/client"
import type {
  Document,
  DocumentAttachment,
  DocumentFirestore,
  DocumentFormValues,
} from "./types/document-types"

const DOCUMENTS_COLLECTION = "documents"

function getCurrentUser() {
  const user = auth.currentUser
  return {
    uid: user?.uid ?? "",
    displayName: user?.displayName ?? user?.email ?? "Unknown",
  }
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date()
}

function firestoreToDocument(id: string, data: DocumentFirestore): Document {
  return {
    ...data,
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getDocuments(): Promise<Document[]> {
  try {
    const q = query(
      collection(db, DOCUMENTS_COLLECTION),
      orderBy("createdAt", "desc")
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) =>
      firestoreToDocument(d.id, d.data() as DocumentFirestore)
    )
  } catch {
    return []
  }
}

export async function createDocument(
  data: DocumentFormValues,
  file?: File | null
): Promise<Document> {
  const { uid, displayName } = getCurrentUser()

  let attachment: DocumentAttachment | null = null

  if (file) {
    const docId = doc(collection(db, DOCUMENTS_COLLECTION)).id
    const storagePath = `documents/${uid}/${docId}/${file.name}`
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    attachment = { name: file.name, url, path: storagePath }
  }

  const newDocRef = doc(collection(db, DOCUMENTS_COLLECTION))
  const payload = {
    name: data.name,
    summary: data.summary ?? "",
    attachment,
    createdBy: uid,
    createdByName: displayName,
    updatedBy: uid,
    updatedByName: displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(newDocRef, payload)

  return {
    id: newDocRef.id,
    name: data.name,
    summary: data.summary ?? "",
    attachment,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: uid,
    createdByName: displayName,
    updatedBy: uid,
    updatedByName: displayName,
  }
}

export async function deleteDocument(
  id: string,
  attachmentPath?: string | null
): Promise<void> {
  if (attachmentPath) {
    try {
      const oldRef = ref(storage, attachmentPath)
      await deleteObject(oldRef)
    } catch {
      // File may not exist; ignore
    }
  }
  await deleteDoc(doc(db, DOCUMENTS_COLLECTION, id))
}

export async function updateDocument(
  id: string,
  data: DocumentFormValues,
  file?: File | null,
  existingAttachment?: DocumentAttachment | null
): Promise<Document> {
  const { uid, displayName } = getCurrentUser()

  let attachment: DocumentAttachment | null = existingAttachment ?? null

  if (file) {
    if (existingAttachment) {
      try {
        const oldRef = ref(storage, existingAttachment.path)
        await deleteObject(oldRef)
      } catch {
        // File may already be deleted; continue
      }
    }

    const storagePath = `documents/${uid}/${id}/${file.name}`
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    attachment = { name: file.name, url, path: storagePath }
  }

  const docRef = doc(db, DOCUMENTS_COLLECTION, id)
  await updateDoc(docRef, {
    name: data.name,
    summary: data.summary ?? "",
    attachment,
    updatedBy: uid,
    updatedByName: displayName,
    updatedAt: serverTimestamp(),
  })

  return {
    id,
    name: data.name,
    summary: data.summary ?? "",
    attachment,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: uid,
    createdByName: displayName,
    updatedBy: uid,
    updatedByName: displayName,
  }
}
