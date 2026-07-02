import type { Metadata } from "next"
import "./globals.css"
import Providers from "./provider"

export const metadata: Metadata = {
  title: "Document Editor",
  description: "Collaborative document editor with offline support",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}