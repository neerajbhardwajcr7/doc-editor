import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextRequest, NextResponse } from "next/server"

interface ActiveUser {
  userId: string
  email: string
  name: string
  cursorPosition: number
  lastActive: string
}

// In-memory store for active users (in production, use Redis)
const activeUsers = new Map<string, Map<string, ActiveUser>>()

// POST update user presence
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { cursorPosition } = await request.json()

    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has access to document
    const document = await prisma.document.findUnique({
      where: { id },
      include: { owner: true, permissions: true },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const hasAccess =
      document.owner.id === session.user.id ||
      document.permissions.some((p) => p.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Initialize document's active users map if not exists
    if (!activeUsers.has(id)) {
      activeUsers.set(id, new Map())
    }

    const docUsers = activeUsers.get(id)!

    // Add/update user presence
    docUsers.set(session.user.id, {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name || "Anonymous",
      cursorPosition: cursorPosition || 0,
      lastActive: new Date().toISOString(),
    })

    console.log("👥 [Presence] User active:", {
      documentId: id,
      user: session.user.email,
      activeCount: docUsers.size,
    })

    // Auto-remove user after 30 seconds of inactivity
    setTimeout(() => {
      const user = docUsers.get(session.user.id)
      if (
        user &&
        new Date().getTime() - new Date(user.lastActive).getTime() > 30000
      ) {
        docUsers.delete(session.user.id)
      }
    }, 30000)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to update presence" },
      { status: 500 }
    )
  }
}

// GET active users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get active users for this document
    const docUsers = activeUsers.get(id) || new Map()

    // Filter out current user and format response
    const activeCollaborators = Array.from(docUsers.values()).filter(
      (u) => u.email !== session.user.email
    )

    console.log("📊 [Presence] Retrieved active users:", activeCollaborators.length)

    return NextResponse.json({
      activeCount: docUsers.size,
      collaborators: activeCollaborators,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to fetch active users" },
      { status: 500 }
    )
  }
}