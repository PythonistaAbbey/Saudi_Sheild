import type { Metadata } from 'next';
import { CheckView } from '@/components/CheckView';

export const metadata: Metadata = { title: 'Is this alert real?' };

export default function Page() {
  return <CheckView />;
}
