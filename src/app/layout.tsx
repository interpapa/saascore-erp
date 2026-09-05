import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from '@/components/core/ThemeProvider';
import { AuthProvider } from '@/components/core/AuthProvider';
import { TenantProvider } from '@/components/core/TenantProvider';
import { ToastProvider } from '@/components/core/ToastProvider';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: 'Rendo',
    template: '%s | Rendo'
  },
  description: 'Enterprise Resource Planning System',
  robots: {
    index: false,
    follow: false,
  }
};

import { ChunkErrorListener } from '@/components/core/ChunkErrorListener';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} font-sans h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
        <ChunkErrorListener />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <TenantProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

