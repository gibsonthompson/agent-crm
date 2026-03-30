import './globals.css'

export const metadata = {
  title: 'Agent CRM',
  description: 'Real Estate Agent CRM',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  themeColor: '#1a2e44',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Agent CRM',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">{children}</body>
    </html>
  )
}