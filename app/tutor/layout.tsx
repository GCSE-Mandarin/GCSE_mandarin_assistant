import { TutorStudentProvider } from '@/components/TutorStudentProvider';

export default function TutorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <TutorStudentProvider>{children}</TutorStudentProvider>;
}
