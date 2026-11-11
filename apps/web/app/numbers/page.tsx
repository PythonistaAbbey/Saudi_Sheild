import type { Metadata } from 'next';
import { NumbersView } from '@/components/NumbersView';

export const metadata: Metadata = { title: 'Emergency numbers' };

export default function Page() {
  return <NumbersView />;
}
