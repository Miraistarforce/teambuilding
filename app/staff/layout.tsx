'use client';

import { Sidebar } from '@/components/ui/sidebar';
import { Clock, FileText, Calendar, DollarSign } from 'lucide-react';

const sidebarItems = [
  { title: '出退勤', href: '/staff', icon: Clock },
  { title: '日報作成', href: '/staff/report', icon: FileText },
  { title: '送信した日報', href: '/staff/reports', icon: Calendar },
  { title: '給与明細', href: '/staff/payroll', icon: DollarSign },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar items={sidebarItems} roleTitle="スタッフ" />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}