import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { NextRequest, NextResponse } from "next/server"

// POST restore document to a specific version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params

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

    // Get the version
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    })

    if (!version || version.documentId !== id) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    // Restore document to this version
    const restored = await prisma.document.update({
      where: { id },
      data: {
        title: version.title,
        content: version.content,
        updatedAt: new Date(),
      },
    })

    console.log("♻️ [Version] Document restored:", {
      documentId: id,
      restoredFromVersion: versionId,
    })

    return NextResponse.json(restored)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to restore version" },
      { status: 500 }
    )
  }
}