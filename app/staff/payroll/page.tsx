'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar, DollarSign, Clock, Moon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatJST } from '@/lib/utils/date';

export default function StaffPayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [payrollData, setPayrollData] = useState<any>(null);

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth]);

  const fetchPayroll = async () => {
    try {
      const res = await fetch(`/api/payroll?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setPayrollData(data);
      }
    } catch (error) {
      console.error('Failed to fetch payroll:', error);
    }
  };

  return (
    <>
      <PageHeader 
        title="給与明細" 
        description="月別の給与明細を確認できます"
      />
      
      <div className="px-8 py-6">
        <div className="max-w-4xl">
          <div className="mb-6">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-48"
            />
          </div>

          {payrollData ? (
            <>
              <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">給与合計</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(payrollData.totalAmount || 0)}
                    </p>
                  </div>
                  <DollarSign className="h-10 w-10 text-blue-500" />
                </div>
                
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="mr-2 h-4 w-4" />
                    実働時間: {Math.floor((payrollData.totalWorkMinutes || 0) / 60)}時間
                    {(payrollData.totalWorkMinutes || 0) % 60}分
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  日別明細
                </h3>
                
                <div className="space-y-2">
                  {payrollData.days?.map((day: any) => (
                    <div key={day.date} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {formatJST(new Date(day.date), 'MM月dd日')}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            実働: {Math.floor(day.workMinutes / 60)}時間{day.workMinutes % 60}分
                          </span>
                          {day.nightMinutes > 0 && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <Moon className="mr-1 h-3 w-3" />
                              深夜: {day.nightMinutes}分
                            </span>
                          )}
                          {day.isHoliday && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                              祝日
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(day.totalAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {(!payrollData.days || payrollData.days.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    この月の勤務データはありません
                  </p>
                )}
              </Card>
            </>
          ) : (
            <Card className="p-12">
              <p className="text-gray-500 text-center">データを読み込み中...</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}