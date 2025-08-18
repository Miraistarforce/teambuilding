'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { Clock, Coffee, LogIn, LogOut } from 'lucide-react';
import { formatJST } from '@/lib/utils/date';

interface ClockStatus {
  currentState: 'CLOCKED_OUT' | 'CLOCKED_IN' | 'BREAKING';
  lastClockIn: Date | null;
  lastBreakStart: Date | null;
}

export default function StaffClockPage() {
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    fetchClockStatus();
    
    return () => clearInterval(interval);
  }, []);

  const fetchClockStatus = async () => {
    try {
      const res = await fetch('/api/clock');
      if (res.ok) {
        const data = await res.json();
        setClockStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch clock status:', error);
    }
  };

  const handleClock = async (action: string) => {
    try {
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        fetchClockStatus();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('打刻に失敗しました');
    }
  };

  const getStatusColor = () => {
    if (!clockStatus) return 'bg-gray-100';
    switch (clockStatus.currentState) {
      case 'CLOCKED_IN':
        return 'bg-green-50 border-green-200';
      case 'BREAKING':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    if (!clockStatus) return '読み込み中...';
    switch (clockStatus.currentState) {
      case 'CLOCKED_IN':
        return '勤務中';
      case 'BREAKING':
        return '休憩中';
      default:
        return '勤務外';
    }
  };

  return (
    <>
      <PageHeader 
        title="出退勤" 
        description={formatJST(currentTime, 'yyyy年MM月dd日 HH:mm:ss')}
      />
      
      <div className="px-8 py-6">
        <div className={`rounded-xl border-2 p-8 mb-8 transition-colors ${getStatusColor()}`}>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">現在のステータス</p>
            <p className="text-3xl font-bold text-gray-900">{getStatusText()}</p>
            
            {clockStatus?.lastClockIn && (
              <div className="mt-4 text-sm text-gray-600">
                <p>出勤時刻: {formatJST(clockStatus.lastClockIn, 'HH:mm')}</p>
                {clockStatus.currentState === 'BREAKING' && clockStatus.lastBreakStart && (
                  <p>休憩開始: {formatJST(clockStatus.lastBreakStart, 'HH:mm')}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          <Button
            size="lg"
            onClick={() => handleClock('in')}
            disabled={clockStatus?.currentState !== 'CLOCKED_OUT'}
            className="h-32 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <LogIn className="mr-3 h-6 w-6" />
            出勤
          </Button>
          
          <Button
            size="lg"
            onClick={() => handleClock('out')}
            disabled={clockStatus?.currentState === 'CLOCKED_OUT'}
            variant="destructive"
            className="h-32 text-lg font-semibold"
          >
            <LogOut className="mr-3 h-6 w-6" />
            退勤
          </Button>
          
          <Button
            size="lg"
            onClick={() => handleClock('break_start')}
            disabled={clockStatus?.currentState !== 'CLOCKED_IN'}
            variant="secondary"
            className="h-32 text-lg font-semibold"
          >
            <Coffee className="mr-3 h-6 w-6" />
            休憩開始
          </Button>
          
          <Button
            size="lg"
            onClick={() => handleClock('break_end')}
            disabled={clockStatus?.currentState !== 'BREAKING'}
            variant="secondary"
            className="h-32 text-lg font-semibold"
          >
            <Clock className="mr-3 h-6 w-6" />
            休憩終了
          </Button>
        </div>
      </div>
    </>
  );
}