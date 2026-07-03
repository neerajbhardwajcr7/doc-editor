// "use client"

// import { useSession } from "next-auth/react"
// import { useParams, useRouter } from "next/navigation"
// import { useEffect, useState } from "react"
// import Link from "next/link"
// import { useLocalStorage } from "@/lib/useLocalStorage"
// import { useVersionHistory, Version } from "@/lib/useVersionHistory"

// interface Document {
//     id: string
//     title: string
//     content: string
//     createdAt: string
//     updatedAt: string
// }

// export default function Editor() {
//     const { id } = useParams() as { id: string }
//     const router = useRouter()
//     const { data: session, status } = useSession()
//     const { localDoc, saveToLocal } = useLocalStorage(id)
//     const { versions, saveVersion, restoreVersion } = useVersionHistory(id)

//     const [document, setDocument] = useState<Document | null>(null)
//     const [title, setTitle] = useState("")
//     const [content, setContent] = useState("")
//     const [saving, setSaving] = useState(false)
//     const [saved, setSaved] = useState(false)
//     const [loading, setLoading] = useState(true)
//     const [isOnline, setIsOnline] = useState(
//         typeof navigator !== "undefined" ? navigator.onLine : true
//     )
//     const [manualOfflineMode, setManualOfflineMode] = useState(false)
//     const [showVersionPanel, setShowVersionPanel] = useState(false)
//     const [snapshotLabel, setSnapshotLabel] = useState("")
//     const [savingSnapshot, setSavingSnapshot] = useState(false)

//     const [summaryLoading, setSummaryLoading] = useState(false)
//     const [summary, setSummary] = useState<string | null>(null)
//     const [showSummary, setShowSummary] = useState(false)


//     const [showShareModal, setShowShareModal] = useState(false)
//     const [shareEmail, setShareEmail] = useState("")
//     const [shareRole, setShareRole] = useState<"EDITOR" | "VIEWER">("EDITOR")
//     const [sharing, setSharing] = useState(false)
//     const [permissions, setPermissions] = useState<any[]>([])


//     const [activeCollaborators, setActiveCollaborators] = useState<any[]>([])
//     const [collaboratorCount, setCollaboratorCount] = useState(0)

//     // Fetch document from server
//     useEffect(() => {
//         if (status === "unauthenticated") {
//             router.push("/auth/signin")
//             return
//         }

//         if (session?.user) {
//             fetchDocument()
//         }
//     }, [session, status])

//     // Monitor online/offline status
//     useEffect(() => {
//         const handleOnline = () => {
//             if (!manualOfflineMode) setIsOnline(true)
//         }
//         const handleOffline = () => {
//             if (!manualOfflineMode) setIsOnline(false)
//         }

//         window.addEventListener("online", handleOnline)
//         window.addEventListener("offline", handleOffline)

//         return () => {
//             window.removeEventListener("online", handleOnline)
//             window.removeEventListener("offline", handleOffline)
//         }
//     }, [manualOfflineMode])

//     // Handle manual offline toggle
//     useEffect(() => {
//         if (manualOfflineMode) {
//             console.log("🔴 [Status] Switched to OFFLINE mode")
//             setIsOnline(false)
//         } else {
//             console.log("🟢 [Status] Switched to ONLINE mode")
//             setIsOnline(navigator.onLine)
//         }
//     }, [manualOfflineMode])

//     const fetchDocument = async () => {
//         try {
//             if (!isOnline) {
//                 if (localDoc) {
//                     setTitle(localDoc.title)
//                     setContent(localDoc.content)
//                     setLoading(false)
//                     return
//                 }
//                 setLoading(false)
//                 return
//             }

//             const res = await fetch(`/api/documents/${id}`)
//             if (!res.ok) {
//                 if (localDoc) {
//                     setTitle(localDoc.title)
//                     setContent(localDoc.content)
//                     setLoading(false)
//                     return
//                 }
//                 alert("Document not found")
//                 router.push("/")
//                 return
//             }
//             const data = await res.json()
//             setDocument(data)
//             setTitle(data.title)
//             setContent(data.content)
//             setLoading(false)
//         } catch (error) {
//             console.error("Failed to fetch document:", error)
//             if (localDoc) {
//                 setTitle(localDoc.title)
//                 setContent(localDoc.content)
//             }
//             setLoading(false)
//         }
//     }


//     // Load permissions
//     const loadPermissions = async () => {
//         try {
//             const res = await fetch(`/api/documents/${id}/share`)
//             if (res.ok) {
//                 const data = await res.json()
//                 setPermissions(data.permissions)
//                 console.log("✅ [Permissions] Loaded:", data.permissions.length)
//             }
//         } catch (error) {
//             console.error("Failed to load permissions:", error)
//         }
//     }

//     // Share document
//     const handleShare = async () => {
//         if (!shareEmail.trim()) {
//             alert("Enter email address")
//             return
//         }

//         setSharing(true)
//         try {
//             console.log("📤 [Share] Sharing with:", shareEmail, "as", shareRole)

//             const res = await fetch(`/api/documents/${id}/share`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ email: shareEmail, role: shareRole }),
//             })

//             if (!res.ok) {
//                 const error = await res.json()
//                 alert(error.error || "Failed to share")
//                 return
//             }

//             console.log("✅ [Share] Document shared successfully")
//             setShareEmail("")
//             await loadPermissions()
//             alert("Document shared successfully!")
//         } catch (error) {
//             console.error("Share failed:", error)
//             alert("Error sharing document")
//         } finally {
//             setSharing(false)
//         }
//     }

//     // Revoke access
//     const handleRevokeAccess = async (userId: string) => {
//         if (!confirm("Remove this user's access?")) return

//         try {
//             const res = await fetch(`/api/documents/${id}/share`, {
//                 method: "DELETE",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ userId }),
//             })

//             if (res.ok) {
//                 await loadPermissions()
//                 console.log("✅ [Permissions] Access revoked")
//             }
//         } catch (error) {
//             console.error("Revoke failed:", error)
//         }
//     }


//     // Update presence
//     const updatePresence = async () => {
//         try {
//             await fetch(`/api/documents/${id}/presence`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ cursorPosition: content.length }),
//             })
//         } catch (error) {
//             console.error("Failed to update presence:", error)
//         }
//     }

//     // Fetch active collaborators
//     const fetchActiveCollaborators = async () => {
//         try {
//             const res = await fetch(`/api/documents/${id}/presence`)
//             if (res.ok) {
//                 const data = await res.json()
//                 setActiveCollaborators(data.collaborators)
//                 setCollaboratorCount(data.activeCount)
//                 console.log("👥 [Collab] Active:", data.activeCount)
//             }
//         } catch (error) {
//             console.error("Failed to fetch collaborators:", error)
//         }
//     }



//     // Poll for active collaborators
//     useEffect(() => {
//         const interval = setInterval(() => {
//             fetchActiveCollaborators()
//             updatePresence()
//         }, 2000)

//         return () => clearInterval(interval)
//     }, [id])




//     // Auto-save to local storage every 2 seconds
//     useEffect(() => {
//         if (!document) return

//         const timer = setTimeout(() => {
//             if (content !== document.content || title !== document.title) {
//                 console.log("⏱️ [AutoSave] Triggering auto-save...")
//                 saveToLocal(title, content)
//                 console.log("✅ [AutoSave] Complete - Status:", isOnline ? "Online" : "Offline")
//             }
//         }, 2000)

//         return () => clearTimeout(timer)
//     }, [content, title, document, isOnline])


//     // Load permissions
//     useEffect(() => {
//         if (document) {
//             loadPermissions()
//         }
//     }, [document])

//     const saveDocument = async () => {
//         console.log("💾 [Editor] User clicked Save button")
//         setSaving(true)

//         // Always save to local storage first
//         console.log("💾 [Editor] Saving to IndexedDB...")
//         await saveToLocal(title, content)
//         console.log("✅ [Editor] IndexedDB save complete")

//         // If online, also save to server
//         if (isOnline) {
//             console.log("📡 [Editor] Online - Attempting to save to server...")
//             try {
//                 const res = await fetch(`/api/documents/${id}`, {
//                     method: "PUT",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify({ title, content }),
//                 })

//                 if (!res.ok) {
//                     console.error("❌ [Editor] Server save failed - HTTP error:", res.status)
//                     alert("Failed to save to server")
//                     setSaving(false)
//                     return
//                 }

//                 const updated = await res.json()
//                 console.log("✅ [Editor] Server save successful:", updated.id)
//                 setDocument(updated)
//                 setSaved(true)

//                 setTimeout(() => setSaved(false), 2000)
//             } catch (error) {
//                 console.error("❌ [Editor] Server save error:", error)
//                 alert("Error saving to server - changes saved locally")
//                 setSaved(true)
//                 setTimeout(() => setSaved(false), 2000)
//             }
//         } else {
//             console.log("🔴 [Editor] Offline - Skipping server save")
//             setSaved(true)
//             setTimeout(() => setSaved(false), 2000)
//         }

//         setSaving(false)
//     }

//     // Save snapshot
//     const handleSaveSnapshot = async () => {
//         if (!snapshotLabel.trim()) {
//             alert("Please enter a label for this snapshot")
//             return
//         }

//         setSavingSnapshot(true)
//         try {
//             console.log("📸 [Editor] Saving snapshot:", snapshotLabel)
//             await saveVersion(title, content, snapshotLabel)
//             console.log("✅ [Editor] Snapshot saved successfully")
//             setSnapshotLabel("")
//             setSaved(true)
//             setTimeout(() => setSaved(false), 2000)
//         } catch (error) {
//             console.error("❌ [Editor] Snapshot save failed:", error)
//             alert("Failed to save snapshot")
//         } finally {
//             setSavingSnapshot(false)
//         }
//     }

//     // Restore version
//     const handleRestoreVersion = async (version: Version) => {
//         if (
//             !confirm(
//                 `Restore to "${version.label}"? Current changes will be replaced.`
//             )
//         ) {
//             return
//         }

//         try {
//             console.log("♻️ [Editor] Restoring version:", version.label)
//             const restored = await restoreVersion(version.id)
//             setTitle(restored.title)
//             setContent(restored.content)
//             setDocument(restored)
//             setSaved(true)
//             setTimeout(() => setSaved(false), 2000)
//             console.log("✅ [Editor] Version restored successfully")
//         } catch (error) {
//             console.error("❌ [Editor] Restore failed:", error)
//             alert("Failed to restore version")
//         }
//     }

//     if (status === "loading" || loading) {
//         return (
//             <div className="min-h-screen flex items-center justify-center">
//                 <p>Loading...</p>
//             </div>
//         )
//     }

//     if (!session) {
//         return (
//             <div className="min-h-screen flex items-center justify-center">
//                 <p>Please sign in</p>
//             </div>
//         )
//     }




//     // Generate AI summary
//     const handleGenerateSummary = async () => {
//         if (content.trim().length === 0) {
//             alert("Document is empty")
//             return
//         }

//         setSummaryLoading(true)
//         try {
//             console.log("🤖 [Editor] Requesting AI summary...")

//             const res = await fetch(`/api/documents/${id}/summarize`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//             })

//             if (!res.ok) {
//                 const error = await res.json()
//                 alert(error.error || "Failed to generate summary")
//                 return
//             }

//             const data = await res.json()
//             console.log("✅ [Editor] Summary generated:", data.summary)
//             setSummary(data.summary)
//             setShowSummary(true)
//         } catch (error) {
//             console.error("❌ [Editor] Summary failed:", error)
//             alert("Error generating summary")
//         } finally {
//             setSummaryLoading(false)
//         }
//     }



//     // Poll for document changes from other users
//     useEffect(() => {
//         const interval = setInterval(async () => {
//             if (!isOnline) return

//             try {
//                 const res = await fetch(`/api/documents/${id}`)
//                 if (res.ok) {
//                     const serverDoc = await res.json()

//                     // If document was updated by someone else
//                     if (
//                         serverDoc.updatedAt &&
//                         document &&
//                         new Date(serverDoc.updatedAt) > new Date(document.updatedAt)
//                     ) {
//                         // Check if current content is different
//                         if (serverDoc.content !== content) {
//                             console.log("🔄 [Collab] New changes from collaborators detected")
//                             // Optional: Show notification
//                             // alert("Document updated by another user")
//                         }
//                     }
//                 }
//             } catch (error) {
//                 console.error("Failed to check for updates:", error)
//             }
//         }, 3000) // Poll every 3 seconds

//         return () => clearInterval(interval)
//     }, [id, isOnline, document, content])



//     return (
//         <div className="min-h-screen bg-gray-50 flex">
//             {/* Version History Sidebar */}
//             <div
//                 className={`${showVersionPanel ? "w-80" : "w-0"
//                     } bg-white shadow-lg transition-all duration-300 overflow-hidden`}
//             >
//                 <div className="p-6 h-full flex flex-col">
//                     <h2 className="text-xl font-bold mb-4">📜 Version History</h2>

//                     {/* Snapshot Input */}
//                     <div className="mb-4 pb-4 border-b">
//                         <input
//                             type="text"
//                             value={snapshotLabel}
//                             onChange={(e) => setSnapshotLabel(e.target.value)}
//                             placeholder="Snapshot label..."
//                             className="w-full px-3 py-2 border rounded text-sm mb-2"
//                         />
//                         <button
//                             onClick={handleSaveSnapshot}
//                             disabled={savingSnapshot}
//                             className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
//                         >
//                             {savingSnapshot ? "Saving..." : "📸 Save Snapshot"}
//                         </button>
//                     </div>

//                     {/* Versions List */}
//                     <div className="flex-1 overflow-y-auto">
//                         {versions.length === 0 ? (
//                             <p className="text-gray-500 text-sm">No versions yet</p>
//                         ) : (
//                             <div className="space-y-2">
//                                 {versions.map((version) => (
//                                     <div
//                                         key={version.id}
//                                         className="bg-gray-50 p-3 rounded border hover:bg-gray-100 transition"
//                                     >
//                                         <p className="font-semibold text-sm">{version.label}</p>
//                                         <p className="text-xs text-gray-500">
//                                             {new Date(version.createdAt).toLocaleString()}
//                                         </p>
//                                         <p className="text-xs text-gray-600 line-clamp-2 my-2">
//                                             {version.content || "No content"}
//                                         </p>
//                                         <button
//                                             onClick={() => handleRestoreVersion(version)}
//                                             className="w-full bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 mt-2"
//                                         >
//                                             ♻️ Restore
//                                         </button>
//                                     </div>
//                                 ))}
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {/* Main Editor */}
//             <div className="flex-1 flex flex-col">
//                 {/* Header */}
//                 <div className="bg-white shadow-md sticky top-0 z-10">
//                     <div className="max-w-7xl mx-auto px-8 py-4">
//                         <div className="flex justify-between items-center">
//                             <div className="flex-1">
//                                 <input
//                                     type="text"
//                                     value={title}
//                                     onChange={(e) => setTitle(e.target.value)}
//                                     placeholder="Document Title"
//                                     className="text-2xl font-bold w-full border-none outline-none"
//                                 />
//                             </div>

//                             <div className="flex items-center space-x-4">
//                                 {/* Online/Offline Status */}
//                                 <div className="flex items-center space-x-2">
//                                     <div
//                                         className={`px-3 py-1 rounded text-sm font-semibold ${isOnline
//                                             ? "bg-green-100 text-green-800"
//                                             : "bg-red-100 text-red-800"
//                                             }`}
//                                     >
//                                         {isOnline ? "🟢 Online" : "🔴 Offline"}
//                                     </div>

//                                     {/* Manual Offline Toggle */}
//                                     <button
//                                         onClick={() => setManualOfflineMode(!manualOfflineMode)}
//                                         className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
//                                     >
//                                         {manualOfflineMode ? "🔌 Simulate" : "Test"}
//                                     </button>

//                                     {/* Version History Toggle */}
//                                     <button
//                                         onClick={() => setShowVersionPanel(!showVersionPanel)}
//                                         className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
//                                     >
//                                         📜 {versions.length}
//                                     </button>
//                                 </div>


//                                 {/* Active Collaborators */}
//                                 <div className="flex items-center space-x-1">
//                                     <span className="text-sm font-semibold text-gray-700">
//                                         👥 {collaboratorCount}
//                                     </span>
//                                     {activeCollaborators.length > 0 && (
//                                         <div className="relative group">
//                                             <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
//                                                 {activeCollaborators.length}
//                                             </div>
//                                             {/* Tooltip */}
//                                             <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 bottom-full mb-2 whitespace-nowrap">
//                                                 {activeCollaborators.map((c) => (
//                                                     <div key={c.userId}>{c.name || c.email}</div>
//                                                 ))}
//                                             </div>
//                                         </div>
//                                     )}
//                                 </div>

//                                 {saving && <span className="text-sm text-gray-500">Saving...</span>}
//                                 {saved && (
//                                     <span className="text-sm text-green-600 font-semibold">
//                                         ✓ Saved
//                                     </span>
//                                 )}


//                                 <button
//                                     onClick={() => setShowShareModal(true)}
//                                     className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
//                                 >
//                                     👥 Share
//                                 </button>

//                                 <button
//                                     onClick={saveDocument}
//                                     disabled={saving}
//                                     className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
//                                 >
//                                     Save
//                                 </button>



//                                 <button
//                                     onClick={handleGenerateSummary}
//                                     disabled={summaryLoading || content.length === 0}
//                                     className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
//                                     title="Generate AI summary of this document"
//                                 >
//                                     {summaryLoading ? "⏳ Summarizing..." : "🤖 Summarize"}
//                                 </button>


//                                 <Link
//                                     href="/"
//                                     className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
//                                 >
//                                     Back
//                                 </Link>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Offline Warning */}
//                 {!isOnline && (
//                     <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
//                         <p className="text-yellow-700">
//                             📡 You're offline. Changes are saved locally.
//                         </p>
//                     </div>
//                 )}

//                 {/* Editor */}
//                 <div className="flex-1 overflow-hidden flex flex-col p-8">
//                     <div className="bg-white rounded-lg shadow-md overflow-hidden flex-1">
//                         <textarea
//                             value={content}
//                             onChange={(e) => setContent(e.target.value)}
//                             placeholder="Start typing your document..."
//                             className="w-full h-full p-6 border-none outline-none resize-none"
//                         />
//                     </div>

//                     {/* Word Count */}
//                     <div className="mt-4 text-right text-sm text-gray-500">
//                         Words: {content.split(/\s+/).filter((w) => w.length > 0).length} |
//                         Characters: {content.length}
//                     </div>
//                 </div>
//             </div>





//             {/* AI Summary Modal */}
//             {showSummary && summary && (
//                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//                     <div className="bg-white rounded-lg p-6 max-w-md shadow-lg">
//                         <h3 className="text-xl font-bold mb-3">🤖 AI Summary</h3>
//                         <p className="text-gray-700 mb-4">{summary}</p>
//                         <button
//                             onClick={() => setShowSummary(false)}
//                             className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
//                         >
//                             Close
//                         </button>
//                     </div>
//                 </div>
//             )}






//             {/* Share Modal */}
//             {showShareModal && (
//                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//                     <div className="bg-white rounded-lg p-6 max-w-md shadow-lg">
//                         <h3 className="text-xl font-bold mb-4">👥 Share Document</h3>

//                         {/* Share Form */}
//                         <div className="space-y-3 mb-4">
//                             <input
//                                 type="email"
//                                 value={shareEmail}
//                                 onChange={(e) => setShareEmail(e.target.value)}
//                                 placeholder="Enter email address"
//                                 className="w-full px-3 py-2 border rounded"
//                             />

//                             <select
//                                 value={shareRole}
//                                 onChange={(e) => setShareRole(e.target.value as "EDITOR" | "VIEWER")}
//                                 className="w-full px-3 py-2 border rounded"
//                             >
//                                 <option value="EDITOR">📝 Editor (can edit)</option>
//                                 <option value="VIEWER">👁️ Viewer (read-only)</option>
//                             </select>

//                             <button
//                                 onClick={handleShare}
//                                 disabled={sharing}
//                                 className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
//                             >
//                                 {sharing ? "Sharing..." : "Share"}
//                             </button>
//                         </div>

//                         {/* Current Permissions */}
//                         <div className="border-t pt-4">
//                             <h4 className="font-semibold mb-2">Shared with:</h4>
//                             {permissions.length === 0 ? (
//                                 <p className="text-sm text-gray-500">Not shared with anyone</p>
//                             ) : (
//                                 <div className="space-y-2">
//                                     {permissions.map((perm) => (
//                                         <div
//                                             key={perm.userId}
//                                             className="flex justify-between items-center bg-gray-50 p-2 rounded"
//                                         >
//                                             <div>
//                                                 <p className="text-sm font-semibold">{perm.email}</p>
//                                                 <p className="text-xs text-gray-500">{perm.role}</p>
//                                             </div>
//                                             <button
//                                                 onClick={() => handleRevokeAccess(perm.userId)}
//                                                 className="text-red-600 text-xs hover:text-red-800"
//                                             >
//                                                 ✕ Remove
//                                             </button>
//                                         </div>
//                                     ))}
//                                 </div>
//                             )}
//                         </div>

//                         <button
//                             onClick={() => setShowShareModal(false)}
//                             className="w-full mt-4 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
//                         >
//                             Close
//                         </button>
//                     </div>
//                 </div>
//             )}



//             {/* Active Collaborators List */}
//             {activeCollaborators.length > 0 && (
//                 <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
//                     <h4 className="font-bold text-sm mb-2">👥 Editing Now</h4>
//                     <div className="space-y-1">
//                         {activeCollaborators.map((collab) => (
//                             <div
//                                 key={collab.userId}
//                                 className="flex items-center space-x-2 text-sm"
//                             >
//                                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
//                                 <div>
//                                     <p className="font-semibold">{collab.name}</p>
//                                     <p className="text-xs text-gray-500">{collab.email}</p>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             )}




//         </div>
//     )
// }






"use client"

import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocalStorage } from "@/lib/useLocalStorage"
import { useVersionHistory, Version } from "@/lib/useVersionHistory"
import { useConflictResolution } from "@/lib/useConflictResolution"

interface Document {
    id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
}

export default function Editor() {
    // ============ HOOKS - ALWAYS FIRST ============
    const { id } = useParams() as { id: string }
    const router = useRouter()
    const { data: session, status } = useSession()
    const { localDoc, saveToLocal } = useLocalStorage(id)
    const { versions, saveVersion, restoreVersion } = useVersionHistory(id)
    const { mergeRemoteChanges, threeWayMerge, lastMergeInfo } = useConflictResolution(id)

    // ============ ALL useState ============
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
    const [showVersionPanel, setShowVersionPanel] = useState(false)
    const [snapshotLabel, setSnapshotLabel] = useState("")
    const [savingSnapshot, setSavingSnapshot] = useState(false)
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [summary, setSummary] = useState<string | null>(null)
    const [showSummary, setShowSummary] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)
    const [shareEmail, setShareEmail] = useState("")
    const [shareRole, setShareRole] = useState<"EDITOR" | "VIEWER">("EDITOR")
    const [sharing, setSharing] = useState(false)
    const [permissions, setPermissions] = useState<any[]>([])
    const [activeCollaborators, setActiveCollaborators] = useState<any[]>([])
    const [collaboratorCount, setCollaboratorCount] = useState(0)

    // ============ ALL useEffect (IN ORDER) ============

    // 1. Fetch document from server
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin")
            return
        }

        if (session?.user) {
            fetchDocument()
        }
    }, [session, status, router, id])

    // 2. Monitor online/offline status
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

    // 3. Handle manual offline toggle
    useEffect(() => {
        if (manualOfflineMode) {
            console.log("🔴 [Status] Switched to OFFLINE mode")
            setIsOnline(false)
        } else {
            console.log("🟢 [Status] Switched to ONLINE mode")
            setIsOnline(navigator.onLine)
        }
    }, [manualOfflineMode])

    // 4. Auto-save to local storage every 2 seconds
    useEffect(() => {
        if (!document) return

        const timer = setTimeout(() => {
            if (content !== document.content || title !== document.title) {
                console.log("⏱️ [AutoSave] Triggering auto-save...")
                saveToLocal(title, content)
                console.log("✅ [AutoSave] Complete - Status:", isOnline ? "Online" : "Offline")
            }
        }, 2000)

        return () => clearTimeout(timer)
    }, [content, title, document, isOnline, saveToLocal])

    // 5. Load permissions
    useEffect(() => {
        if (document) {
            loadPermissions()
        }
    }, [document, id])

    // 6. Poll for active collaborators
    useEffect(() => {
        const interval = setInterval(() => {
            fetchActiveCollaborators()
            updatePresence()
        }, 2000)

        return () => clearInterval(interval)
    }, [id, content])



    // 7. Poll for document changes from other users
    useEffect(() => {
        const interval = setInterval(async () => {
            if (!isOnline) return

            try {
                const res = await fetch(`/api/documents/${id}`)
                if (res.ok) {
                    const serverDoc = await res.json()

                    if (
                        serverDoc.updatedAt &&
                        document &&
                        new Date(serverDoc.updatedAt) > new Date(document.updatedAt)
                    ) {
                        if (serverDoc.content !== content) {
                            console.log("🔄 [Collab] New changes from collaborators detected")

                            // ===== USE CONFLICT RESOLUTION =====
                            const mergeResult = mergeRemoteChanges(serverDoc.content)
                            if (mergeResult) {
                                console.log("🔀 [Collab] Merged conflict-free:", {
                                    conflictDetected: mergeResult.conflictDetected,
                                    mergedChanges: mergeResult.mergedChanges,
                                })
                                // Update content with resolved version
                                setContent(mergeResult.resolved)
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to check for updates:", error)
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [id, isOnline, document, content, mergeRemoteChanges])

    // ============ FUNCTIONS ============

    const fetchDocument = async () => {
        try {
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

    const loadPermissions = async () => {
        try {
            const res = await fetch(`/api/documents/${id}/share`)
            if (res.ok) {
                const data = await res.json()
                setPermissions(data.permissions)
                console.log("✅ [Permissions] Loaded:", data.permissions.length)
            }
        } catch (error) {
            console.error("Failed to load permissions:", error)
        }
    }

    const handleShare = async () => {
        if (!shareEmail.trim()) {
            alert("Enter email address")
            return
        }

        setSharing(true)
        try {
            console.log("📤 [Share] Sharing with:", shareEmail, "as", shareRole)

            const res = await fetch(`/api/documents/${id}/share`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: shareEmail, role: shareRole }),
            })

            if (!res.ok) {
                const error = await res.json()
                alert(error.error || "Failed to share")
                return
            }

            console.log("✅ [Share] Document shared successfully")
            setShareEmail("")
            await loadPermissions()
            alert("Document shared successfully!")
        } catch (error) {
            console.error("Share failed:", error)
            alert("Error sharing document")
        } finally {
            setSharing(false)
        }
    }

    const handleRevokeAccess = async (userId: string) => {
        if (!confirm("Remove this user's access?")) return

        try {
            const res = await fetch(`/api/documents/${id}/share`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            })

            if (res.ok) {
                await loadPermissions()
                console.log("✅ [Permissions] Access revoked")
            }
        } catch (error) {
            console.error("Revoke failed:", error)
        }
    }

    const updatePresence = async () => {
        try {
            await fetch(`/api/documents/${id}/presence`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cursorPosition: content.length }),
            })
        } catch (error) {
            console.error("Failed to update presence:", error)
        }
    }

    const fetchActiveCollaborators = async () => {
        try {
            const res = await fetch(`/api/documents/${id}/presence`)
            if (res.ok) {
                const data = await res.json()
                setActiveCollaborators(data.collaborators)
                setCollaboratorCount(data.activeCount)
                console.log("👥 [Collab] Active:", data.activeCount)
            }
        } catch (error) {
            console.error("Failed to fetch collaborators:", error)
        }
    }

    const saveDocument = async () => {
        console.log("💾 [Editor] User clicked Save button")
        setSaving(true)

        await saveToLocal(title, content)
        console.log("✅ [Editor] IndexedDB save complete")

        if (isOnline) {
            try {
                const res = await fetch(`/api/documents/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, content }),
                })

                if (!res.ok) {
                    console.error("❌ [Editor] Server save failed - HTTP error:", res.status)
                    alert("Failed to save to server")
                    setSaving(false)
                    return
                }

                const updated = await res.json()
                console.log("✅ [Editor] Server save successful:", updated.id)
                setDocument(updated)
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
            } catch (error) {
                console.error("❌ [Editor] Server save error:", error)
                alert("Error saving to server - changes saved locally")
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
            }
        } else {
            console.log("🔴 [Editor] Offline - Skipping server save")
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }

        setSaving(false)
    }

    const handleSaveSnapshot = async () => {
        if (!snapshotLabel.trim()) {
            alert("Please enter a label for this snapshot")
            return
        }

        setSavingSnapshot(true)
        try {
            console.log("📸 [Editor] Saving snapshot:", snapshotLabel)
            await saveVersion(title, content, snapshotLabel)
            console.log("✅ [Editor] Snapshot saved successfully")
            setSnapshotLabel("")
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (error) {
            console.error("❌ [Editor] Snapshot save failed:", error)
            alert("Failed to save snapshot")
        } finally {
            setSavingSnapshot(false)
        }
    }

    const handleRestoreVersion = async (version: Version) => {
        if (
            !confirm(
                `Restore to "${version.label}"? Current changes will be replaced.`
            )
        ) {
            return
        }

        try {
            console.log("♻️ [Editor] Restoring version:", version.label)
            const restored = await restoreVersion(version.id)
            setTitle(restored.title)
            setContent(restored.content)
            setDocument(restored)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
            console.log("✅ [Editor] Version restored successfully")
        } catch (error) {
            console.error("❌ [Editor] Restore failed:", error)
            alert("Failed to restore version")
        }
    }

    const handleGenerateSummary = async () => {
        if (content.trim().length === 0) {
            alert("Document is empty")
            return
        }

        setSummaryLoading(true)
        try {
            console.log("🤖 [Editor] Requesting AI summary...")

            const res = await fetch(`/api/documents/${id}/summarize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            })

            if (!res.ok) {
                const error = await res.json()
                alert(error.error || "Failed to generate summary")
                return
            }

            const data = await res.json()
            console.log("✅ [Editor] Summary generated:", data.summary)
            setSummary(data.summary)
            setShowSummary(true)
        } catch (error) {
            console.error("❌ [Editor] Summary failed:", error)
            alert("Error generating summary")
        } finally {
            setSummaryLoading(false)
        }
    }

    // ============ RENDER ============

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
        <div className="min-h-screen bg-gray-50 flex">
            {/* Version History Sidebar */}
            <div
                className={`${showVersionPanel ? "w-80" : "w-0"
                    } bg-white shadow-lg transition-all duration-300 overflow-hidden`}
            >
                <div className="p-6 h-full flex flex-col">
                    <h2 className="text-xl font-bold mb-4">📜 Version History</h2>

                    <div className="mb-4 pb-4 border-b">
                        <input
                            type="text"
                            value={snapshotLabel}
                            onChange={(e) => setSnapshotLabel(e.target.value)}
                            placeholder="Snapshot label..."
                            className="w-full px-3 py-2 border rounded text-sm mb-2"
                        />
                        <button
                            onClick={handleSaveSnapshot}
                            disabled={savingSnapshot}
                            className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
                        >
                            {savingSnapshot ? "Saving..." : "📸 Save Snapshot"}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {versions.length === 0 ? (
                            <p className="text-gray-500 text-sm">No versions yet</p>
                        ) : (
                            <div className="space-y-2">
                                {versions.map((version) => (
                                    <div
                                        key={version.id}
                                        className="bg-gray-50 p-3 rounded border hover:bg-gray-100 transition"
                                    >
                                        <p className="font-semibold text-sm">{version.label}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(version.createdAt).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-600 line-clamp-2 my-2">
                                            {version.content || "No content"}
                                        </p>
                                        <button
                                            onClick={() => handleRestoreVersion(version)}
                                            className="w-full bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 mt-2"
                                        >
                                            ♻️ Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Editor */}
            <div className="flex-1 flex flex-col">
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
                                <div
                                    className={`px-3 py-1 rounded text-sm font-semibold ${isOnline
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                        }`}
                                >
                                    {isOnline ? "🟢 Online" : "🔴 Offline"}
                                </div>

                                <button
                                    onClick={() => setManualOfflineMode(!manualOfflineMode)}
                                    className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                                >
                                    {manualOfflineMode ? "🔌 Simulate" : "Test"}
                                </button>

                                <button
                                    onClick={handleGenerateSummary}
                                    disabled={summaryLoading || content.length === 0}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                                >
                                    {summaryLoading ? "⏳ Summarizing..." : "🤖 Summarize"}
                                </button>

                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                >
                                    👥 Share
                                </button>

                                <div className="flex items-center space-x-1">
                                    <span className="text-sm font-semibold text-gray-700">
                                        👥 {collaboratorCount}
                                    </span>
                                    {activeCollaborators.length > 0 && (
                                        <div className="relative group">
                                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                                                {activeCollaborators.length}
                                            </div>
                                            <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 bottom-full mb-2 whitespace-nowrap">
                                                {activeCollaborators.map((c) => (
                                                    <div key={c.userId}>{c.name || c.email}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setShowVersionPanel(!showVersionPanel)}
                                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                                >
                                    📜 {versions.length}
                                </button>

                                {saving && <span className="text-sm text-gray-500">Saving...</span>}
                                {saved && (
                                    <span className="text-sm text-green-600 font-semibold">
                                        ✓ Saved
                                    </span>
                                )}

                                <button
                                    onClick={saveDocument}
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

                {!isOnline && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <p className="text-yellow-700">
                            📡 You're offline. Changes are saved locally.
                        </p>
                    </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col p-8">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden flex-1">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Start typing your document..."
                            className="w-full h-full p-6 border-none outline-none resize-none"
                        />
                    </div>

                    <div className="mt-4 text-right text-sm text-gray-500">
                        Words: {content.split(/\s+/).filter((w) => w.length > 0).length} |
                        Characters: {content.length}
                    </div>
                </div>

                {/* Share Modal */}
                {showShareModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md shadow-lg">
                            <h3 className="text-xl font-bold mb-4">👥 Share Document</h3>

                            <div className="space-y-3 mb-4">
                                <input
                                    type="email"
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                    placeholder="Enter email address"
                                    className="w-full px-3 py-2 border rounded"
                                />

                                <select
                                    value={shareRole}
                                    onChange={(e) => setShareRole(e.target.value as "EDITOR" | "VIEWER")}
                                    className="w-full px-3 py-2 border rounded"
                                >
                                    <option value="EDITOR">📝 Editor (can edit)</option>
                                    <option value="VIEWER">👁️ Viewer (read-only)</option>
                                </select>

                                <button
                                    onClick={handleShare}
                                    disabled={sharing}
                                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                    {sharing ? "Sharing..." : "Share"}
                                </button>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-2">Shared with:</h4>
                                {permissions.length === 0 ? (
                                    <p className="text-sm text-gray-500">Not shared with anyone</p>
                                ) : (
                                    <div className="space-y-2">
                                        {permissions.map((perm) => (
                                            <div
                                                key={perm.userId}
                                                className="flex justify-between items-center bg-gray-50 p-2 rounded"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold">{perm.email}</p>
                                                    <p className="text-xs text-gray-500">{perm.role}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRevokeAccess(perm.userId)}
                                                    className="text-red-600 text-xs hover:text-red-800"
                                                >
                                                    ✕ Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setShowShareModal(false)}
                                className="w-full mt-4 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* AI Summary Modal */}
                {showSummary && summary && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md shadow-lg">
                            <h3 className="text-xl font-bold mb-3">🤖 AI Summary</h3>
                            <p className="text-gray-700 mb-4">{summary}</p>
                            <button
                                onClick={() => setShowSummary(false)}
                                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Active Collaborators List */}
                {activeCollaborators.length > 0 && (
                    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
                        <h4 className="font-bold text-sm mb-2">👥 Editing Now</h4>
                        <div className="space-y-1">
                            {activeCollaborators.map((collab) => (
                                <div
                                    key={collab.userId}
                                    className="flex items-center space-x-2 text-sm"
                                >
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <div>
                                        <p className="font-semibold">{collab.name}</p>
                                        <p className="text-xs text-gray-500">{collab.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}