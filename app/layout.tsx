import type { Metadata } from "next";
import { Inder } from "next/font/google";
import "./globals.css";

const inder = Inder({
  subsets: ["latin"],
  weight: "400"
});

export const metadata: Metadata = {
  title: {
    default: "Contact Point",
    template: "%s | Contact Point"
  },
  description: "Shared template platform and admin app for the Contact Point Chrome extension."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inder.className}>{children}</body>
    </html>
  );
}
