import { useEffect, useState } from "react"
import { ConflictResolver, ConflictResolutionResult } from "./conflictResolver"

export function useConflictResolution(documentId: string) {
    const [resolver, setResolver] = useState<ConflictResolver | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [lastMergeInfo, setLastMergeInfo] = useState<ConflictResolutionResult | null>(null)

    // Initialize resolver
    useEffect(() => {
        const init = async () => {
            try {
                console.log("⚙️ [ConflictResolution] Initializing...")
                const newResolver = new ConflictResolver(documentId)
                await newResolver.initPersistence()
                setResolver(newResolver)
                setIsReady(true)
                console.log("✅ [ConflictResolution] Ready")
            } catch (error) {
                console.error("❌ [ConflictResolution] Init failed:", error)
            }
        }

        init()

        return () => {
            resolver?.destroy()
        }
    }, [documentId])

    // Apply local changes
    const applyLocalChanges = (oldContent: string, newContent: string) => {
        if (!resolver || !isReady) {
            console.warn("⚠️ [ConflictResolution] Not ready yet")
            return null
        }

        const result = resolver.applyLocalChanges(oldContent, newContent)
        setLastMergeInfo(result)

        if (result.conflictDetected) {
            console.log("⚠️ [ConflictResolution] Conflict detected and resolved!")
        }

        return result
    }

    // Merge remote changes
    const mergeRemoteChanges = (remoteContent: string) => {
        if (!resolver || !isReady) {
            console.warn("⚠️ [ConflictResolution] Not ready yet")
            return null
        }

        const result = resolver.mergeRemoteChanges(remoteContent)
        setLastMergeInfo(result)

        if (result.conflictDetected) {
            console.log("⚠️ [ConflictResolution] Conflict detected and resolved!")
        }

        return result
    }

    // Three-way merge
    const threeWayMerge = (
        baseContent: string,
        localContent: string,
        remoteContent: string
    ) => {
        if (!resolver || !isReady) {
            console.warn("⚠️ [ConflictResolution] Not ready yet")
            return null
        }

        const result = resolver.threeWayMerge(baseContent, localContent, remoteContent)
        setLastMergeInfo(result)

        return result
    }

    return {
        resolver,
        isReady,
        applyLocalChanges,
        mergeRemoteChanges,
        threeWayMerge,
        lastMergeInfo,
    }
}