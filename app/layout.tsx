import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from './components/ThemeProvider'
import { SupabaseProvider } from './components/SupabaseProvider'
import { PWAInstaller } from './components/PWAInstaller'
import { icons } from 'lucide-react'
import icon from "../public/icons/icon-72x72.png"
const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Budgetracker',
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
    icon: '/icons/ikon.png',  // ✅ direct path from /public
    shortcut: '/favicon.ico',
    apple: [
      { url: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
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