// API-only backend - layout should not render HTML for API routes
// This layout is required by Next.js but API routes bypass it
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // For API-only backend, we return minimal structure
  // API routes (route.ts files) return JSON directly and bypass this
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, display: 'none' }}>{children}</body>
    </html>
  )
}
