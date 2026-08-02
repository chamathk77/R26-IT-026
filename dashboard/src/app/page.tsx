import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DASHBOARD_TOKEN_COOKIE } from '@/lib/auth/constants';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DASHBOARD_TOKEN_COOKIE)?.value;

  redirect(token ? '/home' : '/login');
}
