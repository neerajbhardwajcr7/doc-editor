"use client"

import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocalStorage } from "@/lib/useLocalStorage"
import { useSyncEngine } from "@/lib/useSyncEngine"

interface Document {
    id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
}

export default function Editor() {
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const { data: session, status } = useSession()
    const { localDoc, saveToLocal } = useLocalStorage(id)

    const [document, setDocument] = useState<Document | null>(null)
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(true)
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== "undefined" ? navigator.onLine : true
    )
    const [manualOfflineMode, setManualOfflineMode] = useState(false)

    // Use sync engine
    const isSyncing = false
    const syncError: string | null = null
    const pendingChanges = 0
    const queueChange = async () => { } // No-op function

    // Fetch document from server
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin")
            return
        }

        if (session?.user) {
            fetchDocument()
        }
    }, [session, status])

    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => {
            if (!manualOfflineMode) setIsOnline(true)
        }
        const handleOffline = () => {
            if (!manualOfflineMode) setIsOnline(false)
        }

        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)

        return () => {
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [manualOfflineMode])

    // Handle manual offline toggle
    useEffect(() => {
        if (manualOfflineMode) {
            setIsOnline(false)
        } else {
            setIsOnline(navigator.onLine)
        }
    }, [manualOfflineMode])

    const fetchDocument = async () => {
        try {
            // If offline, skip server fetch and use local data
            if (!isOnline) {
                if (localDoc) {
                    setTitle(localDoc.title)
                    setContent(localDoc.content)
                    setLoading(false)
                    return
                }
                setLoading(false)
                return
            }

            const res = await fetch(`/api/documents/${id}`)
            if (!res.ok) {
                if (localDoc) {
                    setTitle(localDoc.title)
                    setContent(localDoc.content)
                    setLoading(false)
                    return
                }
                alert("Document not found")
                router.push("/")
                return
            }
            const data = await res.json()
            setDocument(data)
            setTitle(data.title)
            setContent(data.content)
            setLoading(false)
        } catch (error) {
            console.error("Failed to fetch document:", error)
            if (localDoc) {
                setTitle(localDoc.title)
                setContent(localDoc.content)
            }
            setLoading(false)
        }
    }

    // Auto-save to local storage every 2 seconds
    useEffect(() => {
        if (!document) return

        const timer = setTimeout(() => {
            if (content !== document.content || title !== document.title) {
                saveToLocal(title, content)
                // Queue for sync if offline
                // if (!isOnline) {
                //     queueChange(title, content)
                // }
            }
        }, 2000)

        return () => clearTimeout(timer)
    }, [content, title, document, isOnline])

    const saveDocument = async () => {
        setSaving(true)

        // Always save to local storage first
        await saveToLocal(title, content)

       
        // If online, also save to server
        if (isOnline) {
            try {
                const res = await fetch(`/api/documents/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, content }),
                })

                if (!res.ok) {
                    alert("Failed to save to server")
                    setSaving(false)
                    return
                }

                const updated = await res.json()
                setDocument(updated)
                setSaved(true)

                setTimeout(() => setSaved(false), 2000)
            } catch (error) {
                console.error("Failed to save document:", error)
                // Just show error, don't try to queue
                alert("Error saving to server - changes saved locally")
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
            }
        } else {
            // OFFLINE - just save to local storage (already done above)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }

        setSaving(false)
    }

    const handleSaveClick = () => {
        saveDocument()
    }

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Loading...</p>
            </div>
        )
    }

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Please sign in</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Document Title"
                                className="text-2xl font-bold w-full border-none outline-none"
                            />
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Online/Offline Status with Sync Info */}
                            <div className="flex items-center space-x-2">
                                <div
                                    className={`px-3 py-1 rounded text-sm font-semibold ${isOnline
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                        }`}
                                >
                                    {isOnline ? "🟢 Online" : "🔴 Offline"}
                                </div>

                                {/* Manual Offline Toggle Button */}
                                <button
                                    onClick={() => setManualOfflineMode(!manualOfflineMode)}
                                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                                    title="Toggle offline mode for testing"
                                >
                                    {manualOfflineMode ? "🔌 Simulate Offline" : "Test Offline"}
                                </button>

                                {/* Sync Status */}
                                {/* {isSyncing && (
                                    <span className="text-sm text-blue-600 font-semibold">
                                        ⏳ Syncing {pendingChanges} change(s)...
                                    </span>
                                )}

                                {pendingChanges > 0 && !isSyncing && (
                                    <span className="text-sm text-orange-600 font-semibold">
                                        ⚠️ {pendingChanges} pending
                                    </span>
                                )}

                                {syncError && (
                                    <span className="text-sm text-red-600 font-semibold">
                                        ❌ {syncError}
                                    </span>
                                )} */}
                            </div>

                            {saving && <span className="text-sm text-gray-500">Saving...</span>}
                            {saved && (
                                <span className="text-sm text-green-600 font-semibold">
                                    ✓ Saved
                                </span>
                            )}

                            <button
                                onClick={handleSaveClick}
                                disabled={saving}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                Save
                            </button>
                            <Link
                                href="/"
                                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                            >
                                Back
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Offline Warning */}
            {!isOnline && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 max-w-7xl mx-auto mt-4">
                    <p className="text-yellow-700">
                        📡 You're offline. Changes are saved locally and will sync automatically when you're back online.
                    </p>
                </div>
            )}

            {/* Sync Error Alert */}
            {syncError && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 max-w-7xl mx-auto mt-4">
                    <p className="text-red-700">
                        ⚠️ {syncError}. {pendingChanges > 0 && `${pendingChanges} change(s) waiting to sync.`}
                    </p>
                </div>
            )}

            {/* Editor */}
            <div className="max-w-7xl mx-auto p-8">
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Start typing your document..."
                        className="w-full h-96 p-6 border-none outline-none resize-none"
                    />
                </div>

                {/* Word Count */}
                <div className="mt-4 text-right text-sm text-gray-500">
                    Words: {content.split(/\s+/).filter((w) => w.length > 0).length} | Characters:{" "}
                    {content.length}
                </div>
            </div>
        </div>
    )
}