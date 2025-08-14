import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from './components/ThemeProvider'
import { SupabaseProvider } from './components/SupabaseProvider'
import { PWAInstaller } from './components/PWAInstaller'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Budget & Expense Tracker',
  description: 'Track your income, expenses, and savings goals with beautiful charts and insights',
  manifest: '/manifest.json',
  metadataBase: new URL('https://budget-tracker-app.vercel.app'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Budget Tracker',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Budget & Expense Tracker',
    title: 'Budget & Expense Tracker',
    description: 'Track your income, expenses, and savings goals with beautiful charts and insights',
  },
  icons: {
    shortcut: '/favicon.ico',
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export const viewport = {
  themeColor: '#3457D5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <SupabaseProvider>
            {children}
            <PWAInstaller />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}