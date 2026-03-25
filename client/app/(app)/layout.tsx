import { BottomNav } from '@/components/ui/BottomNav';
import { hasSessionCookie } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  if (!hasSessionCookie(cookieStore)) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
