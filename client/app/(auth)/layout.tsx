import { hasSessionCookie } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  if (hasSessionCookie(cookieStore)) {
    redirect('/home');
  }

  return children;
}
