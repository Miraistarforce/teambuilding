'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { CalendarDays, FileText, ChevronRight } from 'lucide-react';
import { formatJST } from '@/lib/utils/date';

export default function StaffReportsPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reports] = useState<any[]>([]);

  const getDaysInMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const days = getDaysInMonth();
  const today = new Date().getDate();

  return (
    <>
      <PageHeader 
        title="送信した日報" 
        description="過去の日報を確認できます"
      />
      
      <div className="px-8 py-6">
        <div className="max-w-4xl">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <CalendarDays className="mr-2 h-4 w-4" />
              {formatJST(new Date(), 'yyyy年MM月')}
            </h3>
            
            <div className="grid grid-cols-7 gap-2">
              {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
              
              {days.map((day, index) => (
                <button
                  key={index}
                  onClick={() => day && setSelectedDate(`2024-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                  disabled={!day}
                  className={`
                    aspect-square rounded-lg border flex items-center justify-center text-sm
                    ${!day ? 'invisible' : ''}
                    ${day === today ? 'bg-blue-50 border-blue-300 font-semibold' : 'border-gray-200'}
                    ${day && day < today ? 'hover:bg-gray-50' : ''}
                    ${day && day > today ? 'text-gray-400' : ''}
                    transition-colors
                  `}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {selectedDate && (
            <Card className="p-6">
              <h3 className="font-medium text-gray-900 mb-4">
                {formatJST(new Date(selectedDate), 'MM月dd日')}の日報
              </h3>
              
              {reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center">
                        <FileText className="mr-3 h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{report.staffName}</p>
                          <p className="text-xs text-gray-500">{formatJST(report.createdAt, 'HH:mm')}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  この日の日報はありません
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}