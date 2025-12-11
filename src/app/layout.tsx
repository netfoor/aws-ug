import type { Metadata } from "next";
import "./globals.css";

import AmplifyClientProvider from "@/components/AmplifyClientProvider";
import { AuthProvider } from "../context/auth-context";
import { ThemeProvider } from "../providers/ThemeProvider";
import { Navigation } from "../components/layout/Navigation";
import { OnboardingGuard } from "../components/OnboardingGuard";

export const metadata: Metadata = {
  title: "AWS UG Puebla - User Group Oficial",
  description: "AWS User Group Puebla - Comunidad oficial para entusiastas de la nube, desarrolladores y profesionales DevOps.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0b40" />
      </head>
      <body className="font-amazon min-h-screen bg-background text-text-primary theme-transition">
        <ThemeProvider>
          <AmplifyClientProvider>
            <AuthProvider>
              <OnboardingGuard>
                <div className="flex flex-col min-h-screen">
                  <Navigation />
                  <main className="flex-1">
                    {children}
                  </main>
                </div>
              </OnboardingGuard>
            </AuthProvider>
          </AmplifyClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
