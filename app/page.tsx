"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Document {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export default function Home() {
  const { data: session, status } = useSession()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch documents when user is authenticated
  useEffect(() => {
    if (session?.user) {
      fetchDocuments()
    }
  }, [session])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/documents")
      const data = await res.json()
      setDocuments(data)
    } catch (error) {
      console.error("Failed to fetch documents:", error)
    }
    setLoading(false)
  }

  const createNewDocument = async () => {
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document" }),
      })
      const newDoc = await res.json()
      // Redirect to editor
      window.location.href = `/editor/${newDoc.id}`
    } catch (error) {
      console.error("Failed to create document:", error)
    }
  }

  // const deleteDocument = async (id: string) => {
  //   if (confirm("Are you sure?")) {
  //     try {
  //       await fetch(`/api/documents/${id}`, { method: "DELETE" })
  //       setDocuments(documents.filter((d) => d.id !== id))
  //     } catch (error) {
  //       console.error("Failed to delete document:", error)
  //     }
  //   }
  // }

  const deleteDocument = async (id: string) => {
  if (confirm("Are you sure you want to delete this document?")) {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })

      if (!res.ok) {
        alert("Failed to delete document")
        return
      }

      // Remove from UI immediately
      setDocuments(documents.filter((d) => d.id !== id))
      
      // Refetch to ensure consistency with server
      await fetchDocuments()
      
      alert("Document deleted successfully")
    } catch (error) {
      console.error("Failed to delete document:", error)
      alert("Error deleting document")
      
      // Refetch documents to show current state
      await fetchDocuments()
    }
  }
}

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Document Editor</h1>
          <p className="text-gray-600 mb-8">
            Collaborate, edit, and sync documents offline
          </p>
          <div className="space-x-4">
            <Link
              href="/auth/signin"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-md p-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">📄 Document Editor</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {session.user?.name}</span>
            <button
              onClick={() => signOut()}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">My Documents</h2>
          <button
            onClick={createNewDocument}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
          >
            + New Document
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-600">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">No documents yet</p>
            <button
              onClick={createNewDocument}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Create Your First Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
              >
                <h3 className="text-xl font-semibold mb-2 truncate">
                  {doc.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {doc.content || "No content yet..."}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
                <div className="flex space-x-2">
                  <Link
                    href={`/editor/${doc.id}`}
                    className="flex-1 bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}