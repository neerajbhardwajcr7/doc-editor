// lib/indexeddb.ts
export interface LocalDocument {
    id: string
    title: string
    content: string
    syncedAt: number
    lastModified: number
}

export interface SyncQueueItem {
    id?: number
    docId: string
    title: string
    content: string
    timestamp: number
    synced: boolean
}

export class DocDB {
    private db: IDBDatabase | null = null
    private dbName = "doc_editor_db"
    private storeName = "documents"

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!indexedDB) {
                reject(new Error("IndexedDB not available"))
                return
            }

            const request = indexedDB.open(this.dbName, 1)

            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                this.db = request.result
                resolve()
            }

            // request.onupgradeneeded = (event) => {
            //     const db = (event.target as IDBOpenDBRequest).result
            //     if (!db.objectStoreNames.contains(this.storeName)) {
            //         db.createObjectStore(this.storeName, { keyPath: "id" })
            //     }
            // }

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: "id" })
                }
                // Create sync queue store
                if (!db.objectStoreNames.contains("syncQueue")) {
                    db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true })
                }
            }
        })
    }

    async saveDocument(doc: LocalDocument): Promise<void> {
        if (!this.db) throw new Error("DB not initialized")

            console.log("📝 [IndexedDB] Saving document:", { id: doc.id, title: doc.title })

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], "readwrite")
            const store = transaction.objectStore(this.storeName)
            const request = store.put({
                ...doc,
                lastModified: Date.now(),
            })

            request.onerror = () => {
                console.error("❌ [IndexedDB] Save failed:", request.error)
                reject(request.error)
            }
            transaction.oncomplete = () => {
                console.log("✅ [IndexedDB] Document saved successfully")
                resolve()
            }
        })
    }

    async getDocument(id: string): Promise<LocalDocument | null> {
        if (!this.db) throw new Error("DB not initialized")

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], "readonly")
            const store = transaction.objectStore(this.storeName)
            const request = store.get(id)

            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result || null)
        })
    }

    async getAllDocuments(): Promise<LocalDocument[]> {
        if (!this.db) throw new Error("DB not initialized")

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], "readonly")
            const store = transaction.objectStore(this.storeName)
            const request = store.getAll()

            request.onerror = () => {
                console.error("❌ [IndexedDB] Load failed:", request.error)
                reject(request.error)}
            request.onsuccess = () => {
                
                resolve(request.result || [])}
        })
    }

    async deleteDocument(id: string): Promise<void> {
        if (!this.db) throw new Error("DB not initialized")

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], "readwrite")
            const store = transaction.objectStore(this.storeName)
            const request = store.delete(id)

            request.onerror = () => reject(request.error)
            transaction.oncomplete = () => resolve()
        })
    }






    async addToSyncQueue(docId: string, title: string, content: string): Promise<void> {
        if (!this.db) throw new Error("DB not initialized")

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(["documents", "syncQueue"], "readwrite")
            const syncStore = transaction.objectStore("syncQueue")

            const request = syncStore.add({
                docId,
                title,
                content,
                timestamp: Date.now(),
                synced: false,
            })

            request.onerror = () => reject(request.error)
            transaction.oncomplete = () => resolve()
        })
    }

    async getSyncQueue(): Promise<SyncQueueItem[]> {
        if (!this.db) throw new Error("DB not initialized")

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(["syncQueue"], "readonly")
            const store = transaction.objectStore("syncQueue")
            const request = store.getAll()

            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                const items = (request.result || []) as SyncQueueItem[]
                resolve(items.filter(item => !item.synced))
            }
        })
    }

    async markSyncQueueItemSynced(id: number): Promise<void> {
        if (!this.db) throw new Error("DB not initialized")

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(["syncQueue"], "readwrite")
            const store = transaction.objectStore("syncQueue")
            const getRequest = store.get(id)

            getRequest.onsuccess = () => {
                const item = getRequest.result
                if (item) {
                    item.synced = true
                    const updateRequest = store.put(item)
                    updateRequest.onerror = () => reject(updateRequest.error)
                }
            }

            getRequest.onerror = () => reject(getRequest.error)
            transaction.oncomplete = () => resolve()
        })
    }

    async clearSyncQueue(): Promise<void> {
        if (!this.db) throw new Error("DB not initialized")

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(["syncQueue"], "readwrite")
            const store = transaction.objectStore("syncQueue")
            const request = store.clear()

            request.onerror = () => reject(request.error)
            transaction.oncomplete = () => resolve()
        })
    }









    async clearAll(): Promise<void> {
        if (!this.db) throw new Error("DB not initialized")

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], "readwrite")
            const store = transaction.objectStore(this.storeName)
            const request = store.clear()

            request.onerror = () => reject(request.error)
            transaction.oncomplete = () => resolve()
        })
    }
}

// Singleton instance with proper initialization handling
let dbInstance: DocDB | null = null
let initPromise: Promise<DocDB> | null = null

export async function getDB(): Promise<DocDB> {
  // If already initialized, return it
  if (dbInstance) {
    return dbInstance
  }

  // If initialization in progress, wait for it
  if (initPromise) {
    return initPromise
  }

  // Start initialization
  initPromise = (async () => {
    try {
      dbInstance = new DocDB()
      await dbInstance.init()
      return dbInstance
    } catch (error) {
      console.error("Failed to initialize DB:", error)
      initPromise = null // Reset so it can retry
      throw error
    }
  })()

  return initPromise
}


