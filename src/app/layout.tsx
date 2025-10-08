import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import AmplifyClientProvider from "@/components/AmplifyClientProvider";
import { AuthProvider } from "../context/auth-context";
//import ThemeProviderWrapper from "../components/theme/ThemeProviderWrapper";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Foor.dev - AWS Cloud Engineer & DevOps Specialist",
  description: "AWS Cloud Engineer specializing in serverless architecture, DevOps automation, and cloud infrastructure solutions.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* <ThemeProviderWrapper> */}
          <AmplifyClientProvider>
            <AuthProvider>{children}</AuthProvider>
          </AmplifyClientProvider>
        {/* </ThemeProviderWrapper> */}
      </body>
    </html>
  );
}
