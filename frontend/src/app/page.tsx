"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ZoneGrid } from "@/components/ZoneGrid";
import { NLReportInput } from "@/components/NLReportInput";
import { Sidebar } from "@/components/Sidebar";

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>Loading...</div>;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      {/* Main Content */}
      <main className="dashboard-main">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1>System Overview</h1>
          <div className="status-indicator status-safe">
            <div className="status-dot"></div>
            SYSTEM NORMAL
          </div>
        </header>

        <NLReportInput />

        <ZoneGrid />
      </main>
    </div>
  );
}
