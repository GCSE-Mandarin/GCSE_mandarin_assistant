"use client";

import { useRouter } from 'next/navigation';
import { StudentProgressView } from '@/components/StudentProgressView';

export default function ProgressPage() {
  const router = useRouter();
  return <StudentProgressView onBack={() => router.push('/tutor/dashboard')} />;
}
