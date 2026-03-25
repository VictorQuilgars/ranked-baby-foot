'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Swords, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/home',        icon: Home,   label: 'Accueil' },
  { href: '/leaderboard', icon: Trophy, label: 'Classement' },
  { href: '/match/join',  icon: Swords, label: 'Match' },
  { href: '/profile/me',  icon: User,   label: 'Profil' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 nav-bottom"
      style={{
        background: 'linear-gradient(180deg, transparent 0%, #16213e 20%)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1 max-w-md mx-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl transition-all duration-200',
                isActive ? 'text-accent' : 'text-muted active:scale-90'
              )}
              style={isActive ? {
                background: 'rgba(233,69,96,0.14)',
                boxShadow: 'inset 0 1px 0 rgba(233,69,96,0.25)',
              } : undefined}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={cn(isActive && 'drop-shadow-[0_0_10px_rgba(233,69,96,0.9)]')}
              />
              <span className={cn('text-[10px] font-black tracking-widest uppercase', isActive ? 'text-accent' : 'text-muted')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
