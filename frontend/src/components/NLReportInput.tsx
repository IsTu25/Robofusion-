import React, { useState } from 'react';
import { fetchApi } from '@/lib/api';

export function NLReportInput() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetchApi('/api/nl-report', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      
      setMessage({ type: 'success', text: response.message });
      setText('');
      
      // Clear success message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Natural Language Reporting</h3>
      <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Observe something unusual? Describe it below. 
        Example: "I smell a gas leak in Zone 1, severity 90"
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your observation here..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            outline: 'none'
          }}
        />
        <button 
          type="submit" 
          disabled={loading}
          className="glass-button"
          style={{ padding: '0 24px', fontWeight: 'bold' }}
        >
          {loading ? 'Processing...' : 'Report'}
        </button>
      </form>

      {message && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          color: message.type === 'error' ? 'var(--color-critical)' : 'var(--color-safe)',
          border: `1px solid ${message.type === 'error' ? 'var(--color-critical)' : 'var(--color-safe)'}`
        }}>
          {message.type === 'error' ? '❌ ' : '✅ '}
          {message.text}
        </div>
      )}
    </div>
  );
}
