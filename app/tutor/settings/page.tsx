"use client";

import { useRouter } from 'next/navigation';
import { SettingsView } from '@/components/SettingsView';

export default function SettingsPage() {
  const router = useRouter();
  return <SettingsView onBack={() => router.push('/tutor/dashboard')} />;
}
