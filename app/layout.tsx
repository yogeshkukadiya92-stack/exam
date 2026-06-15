import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ExamHub — Online Exam Platform",
  description: "Modern online examination platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
