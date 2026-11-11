import type { Metadata } from 'next';
import { PrepareView } from '@/components/PrepareView';

export const metadata: Metadata = { title: 'Prepare for emergencies' };

export default function Page() {
  return <PrepareView />;
}
