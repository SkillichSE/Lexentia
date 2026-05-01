'use client';

import { useState, useEffect } from 'react';

export default function Hero() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <header style={{
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
      <a href="/" style={{
        fontSize: '20px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        textDecoration: 'none'
      }}>
        Klyxe
      </a>
      <button
        onClick={toggleTheme}
        style={{
          padding: '8px 16px',
          background: 'var(--accent)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
    </header>
  );
}
