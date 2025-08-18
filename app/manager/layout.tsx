'use client';

import { Sidebar } from '@/components/ui/sidebar';
import { FileText, Users, DollarSign, Mic, Settings } from 'lucide-react';

const sidebarItems = [
  { title: '日報一覧', href: '/manager', icon: FileText },
  { title: 'スタッフ', href: '/manager/staff', icon: Users },
  { title: '給与管理', href: '/manager/payroll', icon: DollarSign },
  { title: '面談記録', href: '/manager/meetings', icon: Mic },
  { title: '設定', href: '/manager/settings', icon: Settings },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar items={sidebarItems} roleTitle="店長" />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}