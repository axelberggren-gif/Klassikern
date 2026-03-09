'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, Plus, BarChart3, Users } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Hem' },
  { href: '/plan', icon: Calendar, label: 'Plan' },
  { href: '/log', icon: Plus, label: 'Logga', isAction: true },
  { href: '/progress', icon: BarChart3, label: 'Framsteg' },
  { href: '/group', icon: Users, label: 'Grupp' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-700 bg-slate-900 pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-transform active:scale-95 animate-pulse-glow"
              >
                <Icon size={28} strokeWidth={2.5} />
              </button>
            );
          }

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
