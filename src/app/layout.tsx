import type { Metadata } from "next";
// Font tự host (gói fontsource, có sẵn tập ký tự latin + tiếng Việt): build không còn gọi mạng tới Google Fonts.
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import { Toaster } from "sonner";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "C-LEAD",
  description: "C-LEAD — HUYNH TRƯỞNG - PHỤNG SỰ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <AppProviders>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </AppProviders>
      </body>
    </html>
  );
}
