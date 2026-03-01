import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contact Point Cloud Platform",
  description: "Cloud template admin for Contact Point extension"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
