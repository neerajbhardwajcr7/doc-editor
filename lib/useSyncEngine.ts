// lib/useSyncEngine.ts
import { useEffect, useState, useCallback } from "react"
import { getDB, SyncQueueItem } from "./indexeddb"

export function useSyncEngine(documentId: string, isOnline: boolean) {
    const [isSyncing, setSyncing] = useState(false)
    const [syncError, setSyncError] = useState<string | null>(null)
    const [pendingChanges, setPendingChanges] = useState(0)
    const [dbReady, setDbReady] = useState(false)

    // Initialize database on mount
    useEffect(() => {
        let mounted = true

        const initDB = async () => {
            try {
                // Add small delay to ensure DOM is ready
                await new Promise(resolve => setTimeout(resolve, 100))
                await getDB()
                if (mounted) {
                    setDbReady(true)
                }
            } catch (error) {
                console.error("Failed to initialize DB:", error)
                if (mounted) {
                    setSyncError("Failed to initialize local storage")
                }
            }
        }

        initDB()

        return () => {
            mounted = false
        }
    }, [])

    // Add document to sync queue
    const queueChange = useCallback(
        async (title: string, content: string) => {
            if (!dbReady) {
                console.warn("DB not ready yet, retrying...")
                return
            }

            try {
                const db = await getDB()
                await db.addToSyncQueue(documentId, title, content)

                // Update pending count
                const queue = await db.getSyncQueue()
                setPendingChanges(queue.length)
            } catch (error) {
                console.error("Failed to queue change:", error)
                setSyncError("Failed to save changes locally")
            }
        },
        [documentId, dbReady]
    )

    // Sync all pending changes
    const syncChanges = useCallback(async () => {
        if (!dbReady) {
            console.warn("DB not ready, skipping sync")
            return
        }

        try {
            setSyncing(true)
            setSyncError(null)

            const db = await getDB()
            const queue = await db.getSyncQueue()

            if (queue.length === 0) {
                setSyncing(false)
                return
            }

            // Sync each change
            for (const item of queue) {
                try {
                    const response = await fetch(`/api/documents/${item.docId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            title: item.title,
                            content: item.content,
                        }),
                    })

                    if (response.ok) {
                        // Mark as synced
                        if (item.id !== undefined) {
                            await db.markSyncQueueItemSynced(item.id)
                        }
                    } else {
                        setSyncError("Failed to sync changes to server")
                        break
                    }
                } catch (error) {
                    console.error("Sync error for document:", error)
                    setSyncError("Sync error - will retry")
                    break
                }
            }

            // Get updated queue
            const updatedQueue = await db.getSyncQueue()
            setPendingChanges(updatedQueue.length)

            setSyncing(false)
        } catch (error) {
            console.error("Sync failed:", error)
            setSyncError("Failed to sync changes")
            setSyncing(false)
        }
    }, [dbReady])

    // Auto-sync when coming online
    useEffect(() => {
        if (isOnline && !isSyncing && dbReady) {
            syncChanges()
        }
    }, [isOnline, isSyncing, syncChanges, dbReady])

    // Check pending changes on mount (after DB is ready)
    useEffect(() => {
        if (!dbReady) return

        const checkPending = async () => {
            try {
                const db = await getDB()
                const queue = await db.getSyncQueue()
                setPendingChanges(queue.length)
            } catch (error) {
                console.error("Failed to check pending changes:", error)
            }
        }

        checkPending()
    }, [dbReady])

    return {
        queueChange,
        syncChanges,
        isSyncing,
        syncError,
        pendingChanges,
    }
}