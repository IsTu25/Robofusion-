import React, { useEffect, useState } from 'react';

export function MLPanel({ prob }: { prob?: number }) {
  if (prob === undefined || prob === null) return null;

  const isHighRisk = prob > 70;

  return (
    <div style={{ marginTop: '16px' }}>
      {isHighRisk && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid var(--color-critical)',
          padding: '8px 12px',
          borderRadius: '4px',
          marginBottom: '8px',
          color: 'var(--color-critical)',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚠️ ML SYSTEM WARNING: CRITICAL STATE IMMINENT
        </div>
      )}
      <div className="glass-panel" style={{ padding: '12px' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          AI Trajectory Prediction
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Probability of entering CRITICAL state (next 60s)</span>
          <span style={{ 
            fontWeight: 'bold', 
            fontSize: '1.2rem',
            color: isHighRisk ? 'var(--color-critical)' : 'var(--color-safe)'
          }}>
            {prob}%
          </span>
        </div>
      </div>
    </div>
  );
}
