import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dear Coco — Order Review",
  description: "Weekly cinnamon bun order review dashboard for Dear Coco @ House of Cinn",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
