import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextRequest, NextResponse } from "next/server"

// POST share document with user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { email, role } = await request.json()

    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user owns this document
    const document = await prisma.document.findUnique({
      where: { id },
      include: { owner: { select: { email: true } } },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (document.owner.email !== session.user.email) {
      return NextResponse.json(
        { error: "Only owner can share" },
        { status: 403 }
      )
    }

    // Find user to share with
    const targetUser = await prisma.user.findUnique({
      where: { email },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    if (targetUser.id === document.ownerId) {
      return NextResponse.json(
        { error: "Cannot share with yourself" },
        { status: 400 }
      )
    }

    // Create or update permission
    const permission = await prisma.documentPermission.upsert({
      where: {
        documentId_userId: {
          documentId: id,
          userId: targetUser.id,
        },
      },
      update: { role },
      create: {
        documentId: id,
        userId: targetUser.id,
        role: role as "OWNER" | "EDITOR" | "VIEWER",
      },
    })

    console.log("📤 [Permissions] Document shared:", {
      documentId: id,
      sharedWith: email,
      role,
    })

    return NextResponse.json(permission, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to share document" },
      { status: 500 }
    )
  }
}

// GET permissions for document
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

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { email: true, name: true } },
        permissions: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if user has access
    const hasAccess =
      document.owner.email === session.user.email ||
      document.permissions.some((p) => p.user.email === session.user.email)

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      owner: document.owner,
      permissions: document.permissions.map((p) => ({
        userId: p.user.id,
        email: p.user.email,
        name: p.user.name,
        role: p.role,
      })),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    )
  }
}

// DELETE revoke access
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await request.json()

    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user owns this document
    const document = await prisma.document.findUnique({
      where: { id },
      include: { owner: { select: { email: true } } },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    if (document.owner.email !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.documentPermission.delete({
      where: {
        documentId_userId: {
          documentId: id,
          userId,
        },
      },
    })

    console.log("🚫 [Permissions] Access revoked:", {
      documentId: id,
      revokedFrom: userId,
    })

    return NextResponse.json({ message: "Access revoked" })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to revoke access" },
      { status: 500 }
    )
  }
}