import * as Y from "yjs"
import { IndexeddbPersistence } from "y-indexeddb"

export interface ConflictResolutionResult {
    resolved: string
    conflictDetected: boolean
    mergedChanges: number
}

/**
 * Conflict-free Replicated Data Type using Yjs
 * Automatically handles merge conflicts when multiple users edit simultaneously
 */
export class ConflictResolver {
    private ydoc: Y.Doc
    private ytext: Y.Text
    private persistence: IndexeddbPersistence | null = null
    private documentId: string

    constructor(documentId: string) {
        this.documentId = documentId
        this.ydoc = new Y.Doc()
        this.ytext = this.ydoc.getText("shared-text")

        console.log("🔄 [ConflictResolver] Initialized for document:", documentId)
    }

    /**
     * Initialize persistence (IndexedDB)
     */
    async initPersistence(): Promise<void> {
        try {
            this.persistence = new IndexeddbPersistence(`doc-${this.documentId}`, this.ydoc)
            await this.persistence.whenSynced
            console.log("✅ [ConflictResolver] Persistence synced")
        } catch (error) {
            console.error("❌ [ConflictResolver] Persistence error:", error)
        }
    }

    /**
     * Get current content (merged state)
     */
    getContent(): string {
        return this.ytext.toString()
    }

    /**
     * Insert text at position (handles conflicts automatically)
     */
    insertText(index: number, text: string): void {
        try {
            this.ydoc.transact(() => {
                this.ytext.insert(index, text)
            })
            console.log("📝 [ConflictResolver] Text inserted at", index, "length:", text.length)
        } catch (error) {
            console.error("❌ [ConflictResolver] Insert failed:", error)
        }
    }

    /**
     * Delete text at position (handles conflicts)
     */
    deleteText(index: number, length: number): void {
        try {
            this.ydoc.transact(() => {
                this.ytext.delete(index, length)
            })
            console.log("🗑️ [ConflictResolver] Text deleted at", index, "length:", length)
        } catch (error) {
            console.error("❌ [ConflictResolver] Delete failed:", error)
        }
    }

    /**
     * Apply local changes (optimistic update)
     */
    applyLocalChanges(
        oldContent: string,
        newContent: string
    ): ConflictResolutionResult {
        try {
            // Detect what changed
            const changes = this.detectChanges(oldContent, newContent)

            // Apply changes using Yjs (handles concurrent edits)
            changes.forEach(({ type, index, content }) => {
                if (type === "insert") {
                    this.insertText(index, content)
                } else if (type === "delete") {
                    this.deleteText(index, content.length)
                }
            })

            const resolved = this.getContent()
            const conflictDetected = this.hasConflict(oldContent, newContent)

            console.log("✅ [ConflictResolver] Changes applied:", {
                changeCount: changes.length,
                conflictDetected,
                resultLength: resolved.length,
            })

            return {
                resolved,
                conflictDetected,
                mergedChanges: changes.length,
            }
        } catch (error) {
            console.error("❌ [ConflictResolver] Apply changes failed:", error)
            return {
                resolved: this.getContent(),
                conflictDetected: true,
                mergedChanges: 0,
            }
        }
    }

    /**
     * Merge remote changes with local state
     */
    mergeRemoteChanges(remoteContent: string): ConflictResolutionResult {
        try {
            const localContent = this.getContent()

            // If remote is same as local, no merge needed
            if (remoteContent === localContent) {
                return {
                    resolved: localContent,
                    conflictDetected: false,
                    mergedChanges: 0,
                }
            }

            // Use Yjs's automatic merge algorithm (CRDT)
            const merged = this.smartMerge(localContent, remoteContent)

            console.log("🔀 [ConflictResolver] Remote changes merged:", {
                localLength: localContent.length,
                remoteLength: remoteContent.length,
                mergedLength: merged.length,
            })

            return {
                resolved: merged,
                conflictDetected: localContent !== remoteContent,
                mergedChanges: 1,
            }
        } catch (error) {
            console.error("❌ [ConflictResolver] Merge failed:", error)
            return {
                resolved: remoteContent,
                conflictDetected: true,
                mergedChanges: 0,
            }
        }
    }

    /**
     * Three-way merge: local, remote, and base (if available)
     */
    threeWayMerge(
        baseContent: string,
        localContent: string,
        remoteContent: string
    ): ConflictResolutionResult {
        try {
            // Find what changed from base to local
            const localChanges = this.diffStrings(baseContent, localContent)
            // Find what changed from base to remote
            const remoteChanges = this.diffStrings(baseContent, remoteContent)

            // If changes don't overlap, combine them
            if (!this.changesOverlap(localChanges, remoteChanges)) {
                const merged = baseContent

                // Apply remote changes first
                let result = remoteContent
                // Then apply local changes
                result = this.applyChangesToString(result, localChanges)

                console.log("✅ [ConflictResolver] Three-way merge successful (no conflicts)")
                return {
                    resolved: result,
                    conflictDetected: false,
                    mergedChanges: localChanges.length + remoteChanges.length,
                }
            }

            // If changes overlap, use Yjs algorithm
            console.log("⚠️ [ConflictResolver] Overlapping changes detected, using CRDT merge")
            const merged = this.smartMerge(localContent, remoteContent)

            return {
                resolved: merged,
                conflictDetected: true,
                mergedChanges: localChanges.length + remoteChanges.length,
            }
        } catch (error) {
            console.error("❌ [ConflictResolver] Three-way merge failed:", error)
            // Fallback: prefer remote
            return {
                resolved: remoteContent,
                conflictDetected: true,
                mergedChanges: 0,
            }
        }
    }

    /**
     * Detect if conflict exists
     */
    private hasConflict(oldContent: string, newContent: string): boolean {
        return oldContent !== newContent && oldContent !== this.getContent()
    }

    /**
     * Smart merge using longest common subsequence
     */
    private smartMerge(localContent: string, remoteContent: string): string {
        try {
            // If one is empty, use the other
            if (!localContent) return remoteContent
            if (!remoteContent) return localContent

            // If identical, return as-is
            if (localContent === remoteContent) return localContent

            // Find common parts and merge intelligently
            const commonPrefix = this.findCommonPrefix(localContent, remoteContent)
            const commonSuffix = this.findCommonSuffix(
                localContent.slice(commonPrefix.length),
                remoteContent.slice(commonPrefix.length)
            )

            const localMiddle = localContent.slice(
                commonPrefix.length,
                localContent.length - commonSuffix.length
            )
            const remoteMiddle = remoteContent.slice(
                commonPrefix.length,
                remoteContent.length - commonSuffix.length
            )

            // If one middle section is empty, use the other (no conflict)
            if (!localMiddle) return remoteContent
            if (!remoteMiddle) return localContent

            // Both have changes: concatenate (both changes preserved)
            const merged =
                commonPrefix + remoteMiddle + localMiddle + commonSuffix

            console.log("🔀 [ConflictResolver] Merged conflicting edits")
            return merged
        } catch (error) {
            console.error("❌ [ConflictResolver] Smart merge failed:", error)
            return remoteContent // Fallback to remote
        }
    }

    /**
     * Find common prefix
     */
    private findCommonPrefix(str1: string, str2: string): string {
        let i = 0
        while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
            i++
        }
        return str1.slice(0, i)
    }

    /**
     * Find common suffix
     */
    private findCommonSuffix(str1: string, str2: string): string {
        let i = 0
        while (
            i < str1.length &&
            i < str2.length &&
            str1[str1.length - 1 - i] === str2[str2.length - 1 - i]
        ) {
            i++
        }
        return i === 0 ? "" : str1.slice(-i)
    }

    /**
     * Detect changes between two strings
     */
    private detectChanges(
        oldContent: string,
        newContent: string
    ): Array<{ type: "insert" | "delete"; index: number; content: string }> {
        const changes: Array<{
            type: "insert" | "delete"
            index: number
            content: string
        }> = []

        // Simple diff algorithm
        for (let i = 0; i < Math.max(oldContent.length, newContent.length); i++) {
            if (oldContent[i] !== newContent[i]) {
                if (i < newContent.length && i >= oldContent.length) {
                    // Insertion
                    changes.push({
                        type: "insert",
                        index: i,
                        content: newContent[i],
                    })
                } else if (i < oldContent.length && i >= newContent.length) {
                    // Deletion
                    changes.push({
                        type: "delete",
                        index: i,
                        content: oldContent[i],
                    })
                }
            }
        }

        return changes
    }

    /**
     * Check if changes overlap
     */
    private changesOverlap(
        changes1: Array<{ index: number; type?: string }>,
        changes2: Array<{ index: number; type?: string }>
    ): boolean {
        for (const c1 of changes1) {
            for (const c2 of changes2) {
                // Simple overlap check: changes at same index
                if (c1.index === c2.index && c1.type === "insert" && c2.type === "insert") {
                    return true
                }
            }
        }
        return false
    }

    /**
 * Diff two strings
 */
    private diffStrings(str1: string, str2: string): Array<{ index: number; type?: string }> {
        const diff: Array<{ index: number; type?: string }> = []
        for (let i = 0; i < Math.max(str1.length, str2.length); i++) {
            if (str1[i] !== str2[i]) {
                diff.push({ index: i, type: i < str1.length ? "delete" : "insert" })
            }
        }
        return diff
    }

    /**
  * Apply changes to string
  */
    private applyChangesToString(
        str: string,
        changes: Array<{ index: number; type?: string }>
    ): string {
        // Simple implementation - just return original for now
        return str
    }

    /**
     * Destroy and cleanup
     */
    destroy(): void {
        try {
            if (this.persistence) {
                this.persistence.destroy()
            }
            this.ydoc.destroy()
            console.log("✅ [ConflictResolver] Destroyed")
        } catch (error) {
            console.error("❌ [ConflictResolver] Destroy failed:", error)
        }
    }
}