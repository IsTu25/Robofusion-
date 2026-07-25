"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { fetchApi } from "@/lib/api";
import { Zone } from "@/components/ZoneCard";

export default function AdminZonesPage() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();
  
  const [zones, setZones] = useState<Zone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== 'admin')) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, role, router]);

  const loadZones = async () => {
    try {
      const data = await fetchApi('/api/zones');
      setZones(data.zones);
    } catch (err: any) {
      setError(err.message || 'Failed to load zones');
    } finally {
      setLoadingZones(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && role === 'admin') {
      loadZones();
    }
  }, [isAuthenticated, role]);

  const handleDelete = async (zoneId: number) => {
    if (!confirm("Are you sure you want to soft-delete this zone?")) return;
    
    try {
      await fetchApi(`/api/zones/${zoneId}`, { method: 'DELETE' });
      // Optimistic update
      setZones(prev => prev.filter(z => z.id !== zoneId));
      alert("Zone deleted successfully.");
    } catch (err: any) {
      alert(`Failed to delete zone: ${err.message}`);
    }
  };

  if (isLoading || !isAuthenticated || role !== 'admin') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>Loading...</div>;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1>Zone Administration</h1>
        </header>

        <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
          {error && <div style={{ color: 'var(--color-critical)', marginBottom: '16px' }}>{error}</div>}
          
          {loadingZones ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading zones...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 8px' }}>ID</th>
                  <th style={{ padding: '12px 8px' }}>Name</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                  <th style={{ padding: '12px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map(zone => (
                  <tr key={zone.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 8px' }}>{zone.id}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                      <Link href={`/admin/zones/${zone.id}`} style={{ color: 'var(--brand-primary)', textDecoration: 'none' }}>
                        {zone.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <div className={`status-indicator status-${zone.status.toLowerCase()}`}>
                        <div className="status-dot" style={{ width: '8px', height: '8px' }}></div>
                        {zone.status}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button 
                        onClick={() => handleDelete(zone.id)}
                        className="glass-button" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--color-critical)', color: 'var(--color-critical)' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {zones.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No active zones found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
