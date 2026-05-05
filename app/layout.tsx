import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "./pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cash Correia",
    template: "%s | Cash Correia",
  },
  description: "Painel financeiro da Cash Correia",
  manifest: "/manifest.webmanifest",
  applicationName: "Cash Correia",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cash Correia",
  },
  icons: {
    icon: [
      {
        url: "/icon-129.png",
        sizes: "500x500",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "500x500",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icon-512.png",
        sizes: "500x500",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
