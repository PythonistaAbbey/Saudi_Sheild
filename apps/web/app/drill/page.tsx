import type { Metadata } from 'next';
import { DrillView } from '@/components/DrillView';

export const metadata: Metadata = { title: 'Try a fictional drill' };

export default function Page() {
  return <DrillView />;
}
