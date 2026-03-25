import { createSessionClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Rediriger uniquement si le token est réellement valide
  if (user) redirect('/home');

  return children;
}
