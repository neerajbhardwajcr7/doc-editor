// lib/useVersionHistory.ts
import { useEffect, useState, useCallback } from "react"

export interface Version {
  id: string
  title: string
  content: string
  label: string
  description?: string
  createdAt: string
  createdBy: string
}

export function useVersionHistory(documentId: string) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load all versions
  const loadVersions = useCallback(async () => {
    try {
      setLoading(true)
      console.log("📜 [VersionHistory] Loading versions for document:", documentId)

      const res = await fetch(`/api/documents/${documentId}/versions`)

      if (!res.ok) {
        throw new Error("Failed to load versions")
      }

      const data = await res.json()
      console.log("✅ [VersionHistory] Loaded", data.length, "versions")
      setVersions(data)
      setError(null)
    } catch (err) {
      console.error("❌ [VersionHistory] Load failed:", err)
      setError("Failed to load versions")
    } finally {
      setLoading(false)
    }
  }, [documentId])

  // Load versions on mount
  useEffect(() => {
    loadVersions()
  }, [documentId])

  // Save new version
  const saveVersion = useCallback(
    async (title: string, content: string, label?: string) => {
      try {
        console.log("📸 [VersionHistory] Saving version:", label)

        const res = await fetch(`/api/documents/${documentId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content,
            label: label || `Snapshot - ${new Date().toLocaleString()}`,
          }),
        })

        if (!res.ok) {
          throw new Error("Failed to save version")
        }

        const version = await res.json()
        console.log("✅ [VersionHistory] Version saved:", version.id)

        // Reload versions list
        await loadVersions()
        setError(null)

        return version
      } catch (err) {
        console.error("❌ [VersionHistory] Save failed:", err)
        setError("Failed to save version")
        throw err
      }
    },
    [documentId, loadVersions]
  )

  // Restore to version
  const restoreVersion = useCallback(
    async (versionId: string) => {
      try {
        console.log("♻️ [VersionHistory] Restoring version:", versionId)

        const res = await fetch(
          `/api/documents/${documentId}/versions/${versionId}/restore`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        )

        if (!res.ok) {
          throw new Error("Failed to restore version")
        }

        const restored = await res.json()
        console.log("✅ [VersionHistory] Version restored successfully")

        setError(null)
        return restored
      } catch (err) {
        console.error("❌ [VersionHistory] Restore failed:", err)
        setError("Failed to restore version")
        throw err
      }
    },
    [documentId]
  )

  return {
    versions,
    loading,
    error,
    saveVersion,
    restoreVersion,
    loadVersions,
  }
}