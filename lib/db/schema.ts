import { pgTable, serial, text, varchar, timestamp, integer, numeric, boolean, json, date, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => companies.id).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => companies.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  requireStorePassword: boolean('require_store_password').default(false).notNull(),
  storePasswordHash: text('store_password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id).notNull(),
  roleType: varchar('role_type', { length: 20, enum: ['owner', 'manager', 'staff'] }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueRoleStore: uniqueIndex('unique_role_store').on(table.storeId, table.roleType),
}));

export const staff = pgTable('staff', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  hourlyWage: numeric('hourly_wage', { precision: 10, scale: 2 }).notNull(),
  holidayBonusPerHour: numeric('holiday_bonus_per_hour', { precision: 10, scale: 2 }).default('0').notNull(),
  mbti: varchar('mbti', { length: 4 }),
  hobby: text('hobby'),
  recentInterest: text('recent_interest'),
  monthlyGoal: text('monthly_goal'),
  hireDate: date('hire_date').notNull(),
  active: boolean('active').default(true).notNull(),
  position: varchar('position', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const clockEvents = pgTable('clock_events', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => staff.id).notNull(),
  storeId: integer('store_id').references(() => stores.id).notNull(),
  type: varchar('type', { length: 20, enum: ['in', 'out', 'break_start', 'break_end'] }).notNull(),
  at: timestamp('at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const timesheets = pgTable('timesheets', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => staff.id).notNull(),
  storeId: integer('store_id').references(() => stores.id).notNull(),
  date: date('date').notNull(),
  workMinutes: integer('work_minutes').default(0).notNull(),
  nightMinutes: integer('night_minutes').default(0).notNull(),
  holidayMinutes: integer('holiday_minutes').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueStaffDate: uniqueIndex('unique_staff_date').on(table.staffId, table.date),
}));

export const payrolls = pgTable('payrolls', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => staff.id).notNull(),
  month: varchar('month', { length: 7 }).notNull(), // YYYY-MM format
  baseAmount: numeric('base_amount', { precision: 10, scale: 2 }).notNull(),
  nightBonus: numeric('night_bonus', { precision: 10, scale: 2 }).notNull(),
  holidayBonus: numeric('holiday_bonus', { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  csvUrl: text('csv_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueStaffMonth: uniqueIndex('unique_staff_month').on(table.staffId, table.month),
}));

export const meetings = pgTable('meetings', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id).notNull(),
  staffId: integer('staff_id').references(() => staff.id),
  source: varchar('source', { length: 10, enum: ['audio', 'text'] }).notNull(),
  audioUrl: text('audio_url'),
  transcript: text('transcript'),
  summary: text('summary'),
  bullets: json('bullets'),
  profileUpdates: json('profile_updates'),
  createdByRole: varchar('created_by_role', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dailyReports = pgTable('daily_reports', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id).notNull(),
  staffId: integer('staff_id').references(() => staff.id).notNull(),
  moodScore: integer('mood_score').notNull(),
  didWell: text('did_well'),
  customerVoice: text('customer_voice'),
  improvement: text('improvement'),
  competitor: text('competitor'),
  other: text('other'),
  tokensCount: integer('tokens_count'),
  toneScore: integer('tone_score'),
  baselineTone: integer('baseline_tone'),
  delta: integer('delta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reportComments = pgTable('report_comments', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id').references(() => dailyReports.id).notNull(),
  authorRole: varchar('author_role', { length: 20 }).notNull(),
  stamp: varchar('stamp', { length: 50 }),
  text: text('text'),
  insertedTemplateKey: varchar('inserted_template_key', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const reportRewards = pgTable('report_rewards', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id').references(() => dailyReports.id).notNull(),
  byRole: varchar('by_role', { length: 20 }).notNull(),
  message: text('message'),
  effect: varchar('effect', { length: 20, enum: ['sparkle'] }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const holidaysJp = pgTable('holidays_jp', {
  date: date('date').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const storeSchedules = pgTable('store_schedules', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id).notNull(),
  weekday: integer('weekday').notNull(), // 0=Sunday, 6=Saturday
  part: varchar('part', { length: 2, enum: ['am', 'pm'] }).notNull(),
  openTime: varchar('open_time', { length: 5 }), // HH:MM format
  closeTime: varchar('close_time', { length: 5 }), // HH:MM format
  isOpen: boolean('is_open').default(true).notNull(),
}, (table) => ({
  uniqueStoreSchedule: uniqueIndex('unique_store_schedule').on(table.storeId, table.weekday, table.part),
}));

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id).notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  value: json('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueStoreKey: uniqueIndex('unique_store_key').on(table.storeId, table.key),
}));

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id),
  actorRole: varchar('actor_role', { length: 50 }),
  action: varchar('action', { length: 100 }).notNull(),
  payload: json('payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  token: text('token').notNull().unique(),
  companyId: integer('company_id').references(() => companies.id),
  storeId: integer('store_id').references(() => stores.id),
  roleId: integer('role_id').references(() => roles.id),
  roleType: varchar('role_type', { length: 20 }),
  staffId: integer('staff_id').references(() => staff.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});