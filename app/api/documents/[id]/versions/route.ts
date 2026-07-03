import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextRequest, NextResponse } from "next/server"

// GET all versions for a document
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

    // Get all versions
    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      select: {
        id: true,
        title: true,
        content: true,
        label: true,
        description: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    )
  }
}

// POST create new version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
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

    const { title, content, label, description } = await request.json()

    // Create version snapshot
    const version = await prisma.documentVersion.create({
      data: {
        documentId: id,
        title,
        content,
        label: label || `v${new Date().toLocaleString()}`,
        description,
        createdBy: user.id,
      },
    })

    console.log("📸 [Version] Snapshot created:", {
      documentId: id,
      versionId: version.id,
      label: version.label,
    })

    return NextResponse.json(version, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    )
  }
}