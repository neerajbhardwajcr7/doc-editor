import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { NextRequest, NextResponse } from "next/server"

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

        // Prevent summarizing empty documents
        if (!document.content || document.content.trim().length === 0) {
            return NextResponse.json(
                { error: "Document is empty" },
                { status: 400 }
            )
        }

        // Prevent summarizing documents that are too long (limit to 10k chars)
        if (document.content.length > 10000) {
            return NextResponse.json(
                {
                    error: "Document too long for summary (max 10,000 characters)",
                },
                { status: 400 }
            )
        }

        console.log("🤖 [AI] Generating summary for document:", id)

        
        // Generate summary using Claude
        const { text: summary } = await generateText({
            model: anthropic("claude-3-5-sonnet-20241022"),
            messages: [
                {
                    role: "user",
                    content: `Please provide a concise summary (2-3 sentences max) of the following document:\n\n${document.content}`,
                },
            ],
        })

        console.log("✅ [AI] Summary generated successfully")

        return NextResponse.json({
            summary,
            documentId: id,
            generatedAt: new Date(),
        })
    } catch (error) {
        console.error("❌ [AI] Summarization failed:", error)
        return NextResponse.json(
            { error: "Failed to generate summary" },
            { status: 500 }
        )
    }
}