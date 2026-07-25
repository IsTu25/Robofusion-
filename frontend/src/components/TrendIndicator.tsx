import React from 'react';

type Trend = 'INSUFFICIENT_DATA' | 'TRENDING_UP' | 'TRENDING_DOWN' | 'STABLE' | undefined;

export function TrendIndicator({ trend }: { trend: Trend }) {
  if (!trend || trend === 'INSUFFICIENT_DATA') {
    return <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>➖</span>;
  }
  
  if (trend === 'TRENDING_UP') {
    return <span style={{ color: 'var(--color-critical)', fontSize: '0.9rem', fontWeight: 'bold' }}>↑ Escalating</span>;
  }
  
  if (trend === 'TRENDING_DOWN') {
    return <span style={{ color: 'var(--color-safe)', fontSize: '0.9rem', fontWeight: 'bold' }}>↓ De-escalating</span>;
  }
  
  return <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>→ Stable</span>;
}
