"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const { logout, role, user } = useAuth();
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar">
      <div style={{ marginBottom: '50px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', background: 'var(--brand-primary)', borderRadius: '8px', boxShadow: '0 0 15px var(--brand-primary-glow)' }}></div>
        <h2 className="text-gradient-brand" style={{ fontSize: '1.6rem', letterSpacing: '0.05em' }}>RoboFusion</h2>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        <Link 
          href="/" 
          className="glass-button" 
          style={{ 
            background: pathname === '/' ? 'rgba(255,255,255,0.1)' : 'transparent',
            textDecoration: 'none',
            borderLeft: pathname === '/' ? '3px solid var(--brand-primary)' : '1px solid var(--border-color)',
            paddingLeft: pathname === '/' ? '17px' : '20px'
          }}
        >
          Overview
        </Link>
        <Link 
          href="/incidents" 
          className="glass-button" 
          style={{ 
            background: pathname === '/incidents' ? 'rgba(255,255,255,0.1)' : 'transparent',
            textDecoration: 'none',
            borderLeft: pathname === '/incidents' ? '3px solid var(--brand-primary)' : '1px solid var(--border-color)',
            paddingLeft: pathname === '/incidents' ? '17px' : '20px'
          }}
        >
          Historical Data
        </Link>
        <Link 
          href="/map" 
          className="glass-button" 
          style={{ 
            background: pathname === '/map' ? 'rgba(255,255,255,0.1)' : 'transparent',
            textDecoration: 'none',
            borderLeft: pathname === '/map' ? '3px solid var(--brand-primary)' : '1px solid var(--border-color)',
            paddingLeft: pathname === '/map' ? '17px' : '20px'
          }}
        >
          Zone Map
        </Link>
        
        {role === 'admin' && (
          <Link 
            href="/admin/zones" 
            className="glass-button" 
            style={{ 
              background: pathname === '/admin/zones' ? 'rgba(255,255,255,0.1)' : 'transparent',
              textDecoration: 'none',
              marginTop: '30px',
              border: '1px solid var(--color-warning)',
              borderLeft: pathname === '/admin/zones' ? '3px solid var(--color-warning)' : '1px solid var(--color-warning)',
              paddingLeft: pathname === '/admin/zones' ? '17px' : '20px',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)'
            }}
          >
            Zone Admin
          </Link>
        )}
      </nav>
      
      {/* User Profile Block */}
      <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            {role === 'admin' ? '🛡️' : '👤'}
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{user || (role === 'admin' ? 'Administrator' : 'Security Staff')}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{role} Role</div>
          </div>
        </div>
        <button onClick={logout} className="glass-button" style={{ width: '100%', fontSize: '0.9rem' }}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
