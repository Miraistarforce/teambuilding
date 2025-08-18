export type RoleType = 'owner' | 'manager' | 'staff';
export type ClockEventType = 'in' | 'out' | 'break_start' | 'break_end';

export interface Company {
  id: number;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

export interface Store {
  id: number;
  companyId: number;
  name: string;
  requireStorePassword: boolean;
  storePasswordHash?: string | null;
  createdAt: Date;
}

export interface Staff {
  id: number;
  storeId: number;
  displayName: string;
  hourlyWage: string;
  holidayBonusPerHour: string;
  mbti?: string | null;
  hobby?: string | null;
  recentInterest?: string | null;
  monthlyGoal?: string | null;
  hireDate: string;
  active: boolean;
  position?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClockEvent {
  id: number;
  staffId: number;
  storeId: number;
  type: ClockEventType;
  at: Date;
  createdAt: Date;
}

export interface DailyReport {
  id: number;
  storeId: number;
  staffId: number;
  moodScore: number;
  didWell?: string | null;
  customerVoice?: string | null;
  improvement?: string | null;
  competitor?: string | null;
  other?: string | null;
  tokensCount?: number | null;
  toneScore?: number | null;
  baselineTone?: number | null;
  delta?: number | null;
  createdAt: Date;
}

export interface Meeting {
  id: number;
  storeId: number;
  staffId?: number | null;
  source: 'audio' | 'text';
  audioUrl?: string | null;
  transcript?: string | null;
  summary?: string | null;
  bullets?: any;
  profileUpdates?: any;
  createdByRole: string;
  createdAt: Date;
}

export interface TimeSheet {
  id: number;
  staffId: number;
  storeId: number;
  date: string;
  workMinutes: number;
  nightMinutes: number;
  holidayMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payroll {
  id: number;
  staffId: number;
  month: string;
  baseAmount: string;
  nightBonus: string;
  holidayBonus: string;
  totalAmount: string;
  csvUrl?: string | null;
  createdAt: Date;
}

export interface Session {
  id: number;
  token: string;
  companyId?: number | null;
  storeId?: number | null;
  roleId?: number | null;
  roleType?: string | null;
  staffId?: number | null;
  expiresAt: Date;
  createdAt: Date;
}