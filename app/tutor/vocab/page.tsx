"use client";

import { useRouter } from 'next/navigation';
import { VocabManagement } from '@/components/VocabManagement';

export default function VocabPage() {
  const router = useRouter();
  return <VocabManagement onBack={() => router.push('/tutor/dashboard')} />;
}
