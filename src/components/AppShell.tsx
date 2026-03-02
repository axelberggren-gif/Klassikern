'use client';

import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-lg pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
