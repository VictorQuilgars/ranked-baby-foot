import { BottomNav } from '@/components/ui/BottomNav';
import { InvitationBanner } from '@/components/ui/InvitationBanner';
import { hasSessionCookie } from '@/lib/auth/session';
import { createSessionClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  if (!hasSessionCookie(cookieStore)) {
    redirect('/login');
  }

  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen">
      {user && <InvitationBanner userId={user.id} />}
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
