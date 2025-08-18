// Mock database for local testing without Supabase
import { hashPassword } from '@/lib/auth/hash';

// Mock data storage
const mockData = {
  companies: [
    {
      id: 1,
      name: 'デモ会社',
      passwordHash: '', // Will be set in init
      createdAt: new Date(),
    },
  ],
  stores: [
    {
      id: 1,
      companyId: 1,
      name: '渋谷店',
      requireStorePassword: false,
      storePasswordHash: null,
      createdAt: new Date(),
    },
    {
      id: 2,
      companyId: 1,
      name: '新宿店',
      requireStorePassword: true,
      storePasswordHash: '', // Will be set in init
      createdAt: new Date(),
    },
  ],
  roles: [
    {
      id: 1,
      storeId: 1,
      roleType: 'staff',
      displayName: 'スタッフ',
      passwordHash: null,
      createdAt: new Date(),
    },
    {
      id: 2,
      storeId: 1,
      roleType: 'manager',
      displayName: '店長',
      passwordHash: '', // Will be set in init
      createdAt: new Date(),
    },
    {
      id: 3,
      storeId: 1,
      roleType: 'owner',
      displayName: 'オーナー',
      passwordHash: '', // Will be set in init
      createdAt: new Date(),
    },
    {
      id: 4,
      storeId: 2,
      roleType: 'staff',
      displayName: 'スタッフ',
      passwordHash: null,
      createdAt: new Date(),
    },
    {
      id: 5,
      storeId: 2,
      roleType: 'manager',
      displayName: '店長',
      passwordHash: '', // Will be set in init
      createdAt: new Date(),
    },
    {
      id: 6,
      storeId: 2,
      roleType: 'owner',
      displayName: 'オーナー',
      passwordHash: '', // Will be set in init
      createdAt: new Date(),
    },
  ],
  staff: [
    {
      id: 1,
      storeId: 1,
      displayName: '田中太郎',
      hourlyWage: '1200',
      holidayBonusPerHour: '100',
      mbti: 'INTJ',
      hobby: '読書',
      recentInterest: '料理',
      monthlyGoal: '新メニューの開発',
      hireDate: '2024-01-15',
      position: 'キッチンスタッフ',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      storeId: 1,
      displayName: '佐藤花子',
      hourlyWage: '1100',
      holidayBonusPerHour: '50',
      mbti: 'ENFP',
      hobby: '音楽鑑賞',
      recentInterest: '接客スキル向上',
      monthlyGoal: 'お客様満足度向上',
      hireDate: '2024-03-01',
      position: 'ホールスタッフ',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      storeId: 1,
      displayName: '鈴木一郎',
      hourlyWage: '1500',
      holidayBonusPerHour: '150',
      mbti: 'ESTJ',
      hobby: 'スポーツ',
      recentInterest: '経営管理',
      monthlyGoal: '売上目標達成',
      hireDate: '2023-06-01',
      position: 'シフトリーダー',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  sessions: [] as any[],
  dailyReports: [] as any[],
  clockEvents: [] as any[],
  timesheets: [] as any[],
  settings: [
    {
      id: 1,
      storeId: 1,
      key: 'mood_alert',
      value: {
        scoreThreshold: 50,
        consecutiveDays: 3,
        baselineDelta: -15,
      },
      updatedAt: new Date(),
    },
  ],
  holidaysJp: [
    { date: '2024-01-01', name: '元日' },
    { date: '2024-01-08', name: '成人の日' },
    { date: '2024-02-11', name: '建国記念の日' },
    { date: '2024-02-23', name: '天皇誕生日' },
    { date: '2024-03-20', name: '春分の日' },
    { date: '2024-04-29', name: '昭和の日' },
    { date: '2024-05-03', name: '憲法記念日' },
    { date: '2024-05-04', name: 'みどりの日' },
    { date: '2024-05-05', name: 'こどもの日' },
  ],
};

// Initialize mock data with hashed passwords
export async function initMockData() {
  // Hash passwords
  mockData.companies[0].passwordHash = await hashPassword('demo123');
  mockData.stores[1].storePasswordHash = await hashPassword('store123');
  
  // Hash role PINs
  const managerPinHash = await hashPassword('1234');
  const ownerPinHash = await hashPassword('5678');
  
  mockData.roles[1].passwordHash = managerPinHash; // Store 1 manager
  mockData.roles[2].passwordHash = ownerPinHash;   // Store 1 owner
  mockData.roles[4].passwordHash = managerPinHash; // Store 2 manager
  mockData.roles[5].passwordHash = ownerPinHash;   // Store 2 owner
}

// Mock database functions
export const mockDb = {
  // Companies
  getCompanyByName: async (name: string) => {
    return mockData.companies.find(c => c.name === name);
  },
  
  getAllCompanies: async () => {
    return mockData.companies;
  },
  
  createCompany: async (data: any) => {
    const company = {
      id: mockData.companies.length + 1,
      ...data,
      createdAt: new Date(),
    };
    mockData.companies.push(company);
    return company;
  },
  
  // Stores
  getStoresByCompanyId: async (companyId: number) => {
    return mockData.stores.filter(s => s.companyId === companyId);
  },
  
  getStoreById: async (id: number) => {
    return mockData.stores.find(s => s.id === id);
  },
  
  createStore: async (data: any) => {
    const store = {
      id: mockData.stores.length + 1,
      ...data,
      createdAt: new Date(),
    };
    mockData.stores.push(store);
    return store;
  },
  
  // Roles
  getRoleByStoreAndType: async (storeId: number, roleType: string) => {
    return mockData.roles.find(r => r.storeId === storeId && r.roleType === roleType);
  },
  
  // Staff
  getStaffByStoreId: async (storeId: number) => {
    return mockData.staff.filter(s => s.storeId === storeId && s.active);
  },
  
  getStaffById: async (id: number) => {
    return mockData.staff.find(s => s.id === id);
  },
  
  createStaff: async (data: any) => {
    const staff = {
      id: mockData.staff.length + 1,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockData.staff.push(staff);
    return staff;
  },
  
  updateStaff: async (id: number, data: any) => {
    const index = mockData.staff.findIndex(s => s.id === id);
    if (index !== -1) {
      mockData.staff[index] = {
        ...mockData.staff[index],
        ...data,
        updatedAt: new Date(),
      };
      return mockData.staff[index];
    }
    return null;
  },
  
  // Sessions
  createSession: async (data: any) => {
    const session = {
      id: mockData.sessions.length + 1,
      token: Math.random().toString(36).substring(2),
      ...data,
      createdAt: new Date(),
    };
    mockData.sessions.push(session);
    return session;
  },
  
  getSessionByToken: async (token: string) => {
    const session = mockData.sessions.find(s => s.token === token);
    if (session && new Date(session.expiresAt) > new Date()) {
      return session;
    }
    return null;
  },
  
  deleteSession: async (token: string) => {
    mockData.sessions = mockData.sessions.filter(s => s.token !== token);
  },
  
  // Reports
  createReport: async (data: any) => {
    const report = {
      id: mockData.dailyReports.length + 1,
      ...data,
      createdAt: new Date(),
    };
    mockData.dailyReports.push(report);
    return report;
  },
  
  getReportsByStoreId: async (storeId: number) => {
    return mockData.dailyReports
      .filter(r => r.storeId === storeId)
      .map(r => {
        const staff = mockData.staff.find(s => s.id === r.staffId);
        return {
          ...r,
          staffName: staff?.displayName || 'Unknown',
          comments: [],
          rewards: [],
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
  
  deleteReport: async (id: number) => {
    mockData.dailyReports = mockData.dailyReports.filter(r => r.id !== id);
  },
  
  // Clock events
  createClockEvent: async (data: any) => {
    const event = {
      id: mockData.clockEvents.length + 1,
      ...data,
      at: new Date(),
      createdAt: new Date(),
    };
    mockData.clockEvents.push(event);
    return event;
  },
  
  getClockEventsByStaffId: async (staffId: number) => {
    return mockData.clockEvents
      .filter(e => e.staffId === staffId)
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 10);
  },
  
  // Settings
  getSettingByKey: async (storeId: number, key: string) => {
    return mockData.settings.find(s => s.storeId === storeId && s.key === key);
  },
  
  upsertSetting: async (storeId: number, key: string, value: any) => {
    const existing = mockData.settings.find(s => s.storeId === storeId && s.key === key);
    if (existing) {
      existing.value = value;
      existing.updatedAt = new Date();
      return existing;
    } else {
      const setting = {
        id: mockData.settings.length + 1,
        storeId,
        key,
        value,
        updatedAt: new Date(),
      };
      mockData.settings.push(setting);
      return setting;
    }
  },
  
  // Holidays
  getHolidaysInRange: async (startDate: string, endDate: string) => {
    return mockData.holidaysJp.filter(h => h.date >= startDate && h.date <= endDate);
  },
};

// Initialize mock data on module load
initMockData();