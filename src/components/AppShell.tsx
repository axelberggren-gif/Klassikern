'use client';

import BottomNav from './BottomNav';
import InstallBanner from './InstallBanner';
import NotificationPrompt from './NotificationPrompt';
import OfflineBanner from './OfflineBanner';
import RealtimeNotifications from './RealtimeNotifications';
import SyncManager from './SyncManager';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <SyncManager />
      <RealtimeNotifications />
      <main className="mx-auto max-w-lg pb-24">
        {children}
        <div className="mt-4">
          <OfflineBanner />
          <InstallBanner />
        </div>
      </main>
      <BottomNav />
      <NotificationPrompt />
    </div>
  );
}
