'use client';

import { Sidebar } from '@/components/ui/sidebar';
import { FileText, Users, DollarSign, Mic, Settings } from 'lucide-react';

const sidebarItems = [
  { title: '日報一覧', href: '/owner', icon: FileText },
  { title: 'スタッフ', href: '/owner/staff', icon: Users },
  { title: '給与管理', href: '/owner/payroll', icon: DollarSign },
  { title: '面談記録', href: '/owner/meetings', icon: Mic },
  { title: '設定', href: '/owner/settings', icon: Settings },
];

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar items={sidebarItems} roleTitle="オーナー" />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}