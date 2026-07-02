// lib/useLocalStorage.ts
import { useEffect, useState } from "react"
import { getDB, LocalDocument } from "./indexeddb"

export function useLocalStorage(documentId: string) {
  const [localDoc, setLocalDoc] = useState<LocalDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize and load document
  useEffect(() => {
    const loadDoc = async () => {
      try {
        setIsLoading(true)
        const db = await getDB()
        const doc = await db.getDocument(documentId)
        setLocalDoc(doc)
        setError(null)
      } catch (err) {
        console.error("Failed to load from IndexedDB:", err)
        setError("Failed to load local data")
      } finally {
        setIsLoading(false)
      }
    }

    // Add small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      loadDoc()
    }, 100)

    return () => clearTimeout(timer)
  }, [documentId])

  const saveToLocal = async (title: string, content: string) => {
    try {
      const db = await getDB()
      await db.saveDocument({
        id: documentId,
        title,
        content,
        syncedAt: Date.now(),
        lastModified: Date.now(),
      })
      setLocalDoc({
        id: documentId,
        title,
        content,
        syncedAt: Date.now(),
        lastModified: Date.now(),
      })
      setError(null)
    } catch (err) {
      console.error("Failed to save to IndexedDB:", err)
      setError("Failed to save locally")
    }
  }

  const deleteLocal = async () => {
    try {
      const db = await getDB()
      await db.deleteDocument(documentId)
      setLocalDoc(null)
      setError(null)
    } catch (err) {
      console.error("Failed to delete from IndexedDB:", err)
      setError("Failed to delete local data")
    }
  }

  return {
    localDoc,
    isLoading,
    error,
    saveToLocal,
    deleteLocal,
  }
}