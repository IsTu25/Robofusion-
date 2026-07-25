"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const { logout, role } = useAuth();
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <h2 className="text-gradient" style={{ marginBottom: '40px' }}>RoboFusion</h2>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <Link 
          href="/" 
          className="glass-button" 
          style={{ 
            background: pathname === '/' ? 'rgba(255,255,255,0.1)' : 'transparent',
            textDecoration: 'none'
          }}
        >
          Overview
        </Link>
        <Link 
          href="/incidents" 
          className="glass-button" 
          style={{ 
            background: pathname === '/incidents' ? 'rgba(255,255,255,0.1)' : 'transparent',
            textDecoration: 'none'
          }}
        >
          Historical Data
        </Link>
        <div className="glass-button" style={{ opacity: 0.5, cursor: 'not-allowed' }}>Zone Map</div>
        
        {role === 'admin' && (
          <Link 
            href="/admin/zones" 
            className="glass-button" 
            style={{ 
              background: pathname === '/admin/zones' ? 'rgba(255,255,255,0.1)' : 'transparent',
              textDecoration: 'none',
              marginTop: '20px',
              border: '1px solid var(--color-warning)'
            }}
          >
            Zone Admin
          </Link>
        )}
      </nav>
      
      <button onClick={logout} className="glass-button" style={{ marginTop: 'auto' }}>
        Sign Out
      </button>
    </aside>
  );
}
