import HomeNavbar from '@/app/home/components/HomeNavbar';

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <HomeNavbar hideAuthButtons />
      <main style={{ minHeight: '80vh', background: 'transparent', width: '100%' }}>
        {children}
      </main>
    </div>
  );
} 