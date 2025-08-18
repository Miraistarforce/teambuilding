'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface SidebarItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: SidebarItem[];
  roleTitle: string;
}

export function Sidebar({ items, roleTitle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-2">チムビル</h2>
        <h1 className="text-xl font-bold text-gray-900">{roleTitle}</h1>
      </div>
      
      <nav className="px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1',
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}