import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Apex Forex — Lot-Wise Foreign Currency Trading Platform",
  description:
    "Institutional Forex Department Management System. Complete lot-wise stock tracking, FIFO & manual lot allocation, real-time realized profit engine, and immutable inventory movement ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
