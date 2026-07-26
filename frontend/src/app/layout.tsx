import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RoboFusion Dashboard",
  description: "Real-time robotics monitoring dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <div className="bg-mesh">
          <div className="bg-grid-overlay"></div>
          <div className="bg-radial-glow"></div>
        </div>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
