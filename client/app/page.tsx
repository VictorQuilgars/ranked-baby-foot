import { redirect } from 'next/navigation';

// Redirige la racine vers /home (le middleware gère l'auth)
export default function RootPage() {
  redirect('/home');
}
