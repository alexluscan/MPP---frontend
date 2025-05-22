import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StatusIndicator from "./components/StatusIndicator";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Product Management",
  description: "A simple product management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StatusIndicator />
        {children}
      </body>
    </html>
  );
}