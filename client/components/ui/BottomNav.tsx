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
        background: '#07080d',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex items-stretch justify-around max-w-md mx-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center gap-1 flex-1 pt-2.5 pb-1 transition-all duration-150',
                isActive ? 'active:scale-95' : 'active:scale-90',
              )}
            >
              {/* Indicateur actif — barre en haut */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px]"
                  style={{
                    width: 28,
                    background: '#e94560',
                    boxShadow: '0 0 8px rgba(233,69,96,0.7)',
                  }}
                />
              )}

              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.6}
                style={{ color: isActive ? '#e94560' : 'rgba(255,255,255,0.3)' }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: isActive ? '#e94560' : 'rgba(255,255,255,0.25)' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
