import Hero from './components/Hero';

export default function Home() {
  return (
    <main>
      <Hero />
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Klyxe AI Benchmark</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Site is being migrated to Next.js. Content will appear here shortly.
        </p>
      </div>
    </main>
  );
}
