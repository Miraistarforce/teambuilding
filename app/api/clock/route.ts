import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getNowJST, calculateNightMinutes } from '@/lib/utils/date';
import { mockDb } from '@/lib/db/mock';
import { differenceInMinutes } from 'date-fns';

type ClockState = 'CLOCKED_OUT' | 'CLOCKED_IN' | 'BREAKING';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.staffId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Get latest clock events for this staff
    const events = await mockDb.getClockEventsByStaffId(session.staffId);

    // Determine current state
    let currentState: ClockState = 'CLOCKED_OUT';
    let lastClockIn: Date | null = null;
    let lastBreakStart: Date | null = null;

    if (events.length > 0) {
      const lastEvent = events[0];
      
      if (lastEvent.type === 'in') {
        currentState = 'CLOCKED_IN';
        lastClockIn = lastEvent.at;
      } else if (lastEvent.type === 'break_start') {
        currentState = 'BREAKING';
        // Find last clock in
        for (const event of events) {
          if (event.type === 'in') {
            lastClockIn = event.at;
            break;
          }
        }
        lastBreakStart = lastEvent.at;
      }
    }

    return NextResponse.json({
      currentState,
      lastClockIn,
      lastBreakStart,
      recentEvents: events,
    });
  } catch (error) {
    console.error('Get clock status error:', error);
    return NextResponse.json(
      { error: 'ステータス取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.staffId || !session.storeId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!['in', 'out', 'break_start', 'break_end'].includes(action)) {
      return NextResponse.json(
        { error: '無効なアクションです' },
        { status: 400 }
      );
    }

    // Get current state
    const events = await mockDb.getClockEventsByStaffId(session.staffId);

    let currentState: ClockState = 'CLOCKED_OUT';
    let lastClockIn: Date | null = null;
    let lastBreakStart: Date | null = null;

    if (events.length > 0) {
      const lastEvent = events[0];
      
      if (lastEvent.type === 'in') {
        currentState = 'CLOCKED_IN';
        lastClockIn = lastEvent.at;
      } else if (lastEvent.type === 'break_start') {
        currentState = 'BREAKING';
        lastBreakStart = lastEvent.at;
        // Find last clock in
        for (const event of events) {
          if (event.type === 'in') {
            lastClockIn = event.at;
            break;
          }
        }
      }
    }

    // Validate state transition
    if (action === 'in' && currentState !== 'CLOCKED_OUT') {
      return NextResponse.json(
        { error: 'すでに出勤しています' },
        { status: 400 }
      );
    }

    if (action === 'out' && currentState === 'CLOCKED_OUT') {
      return NextResponse.json(
        { error: 'まだ出勤していません' },
        { status: 400 }
      );
    }

    if (action === 'break_start' && currentState !== 'CLOCKED_IN') {
      return NextResponse.json(
        { error: '休憩を開始できる状態ではありません' },
        { status: 400 }
      );
    }

    if (action === 'break_end' && currentState !== 'BREAKING') {
      return NextResponse.json(
        { error: '休憩中ではありません' },
        { status: 400 }
      );
    }

    // Record the clock event
    const now = getNowJST();
    const newEvent = await mockDb.createClockEvent({
        staffId: session.staffId,
        storeId: session.storeId,
        type: action,
        at: now,
      });

    // Update timesheet if clocking out
    if (action === 'out' && lastClockIn) {
      const date = lastClockIn.toISOString().split('T')[0];
      
      // Calculate work minutes
      let totalMinutes = differenceInMinutes(now, lastClockIn);
      
      // Subtract break time
      let breakMinutes = 0;
      const todayEvents = events.filter(e => 
        e.at.toISOString().split('T')[0] === date
      );
      
      for (let i = 0; i < todayEvents.length - 1; i++) {
        if (todayEvents[i].type === 'break_start') {
          const nextEvent = todayEvents[i + 1];
          if (nextEvent && nextEvent.type === 'break_end') {
            breakMinutes += differenceInMinutes(nextEvent.at, todayEvents[i].at);
          }
        }
      }
      
      const workMinutes = totalMinutes - breakMinutes;
      const nightMinutes = calculateNightMinutes(lastClockIn, now);
      
      // Check if it's a holiday
      // TODO: Check holidays_jp table
      const holidayMinutes = 0;
      
      // Mock timesheet update
      // In a real implementation, this would update the timesheet
    }

    return NextResponse.json({
      success: true,
      event: newEvent,
      message: getClockMessage(action),
    });
  } catch (error) {
    console.error('Clock action error:', error);
    return NextResponse.json(
      { error: '打刻処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

function getClockMessage(action: string): string {
  switch (action) {
    case 'in':
      return '出勤しました';
    case 'out':
      return '退勤しました';
    case 'break_start':
      return '休憩を開始しました';
    case 'break_end':
      return '休憩を終了しました';
    default:
      return '打刻しました';
  }
}