"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { IncidentTimeline } from "@/components/IncidentTimeline";

export default function IncidentsPage() {
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
          <h1>Historical Data</h1>
        </header>

        <div className="glass-panel" style={{ padding: '24px', minHeight: '300px' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Incident Timeline</h3>
          <IncidentTimeline />
        </div>
      </main>
    </div>
  );
}
