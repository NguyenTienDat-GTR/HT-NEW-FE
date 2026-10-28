import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "C-LEAD",
  description: "C-LEAD — Đào luyện người Huynh Trưởng, phụng sự Đức Kitô.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={plusJakartaSans.variable}>
        <AppProviders>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </AppProviders>
      </body>
    </html>
  );
}
