"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MapClient } from "@/components/MapClient";

export default function MapPage() {
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
        <header style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          marginBottom: '40px', background: 'rgba(255,255,255,0.02)', 
          padding: '24px 32px', borderRadius: '20px', 
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '4px', letterSpacing: '-0.02em' }}>Interactive Zone Map</h1>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Top-down view of all campus IoT endpoints</div>
          </div>
          <div className="status-indicator status-safe" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px 20px' }}>
            <div className="status-dot"></div>
            LIVE FEED
          </div>
        </header>

        <MapClient />
      </main>
    </div>
  );
}
