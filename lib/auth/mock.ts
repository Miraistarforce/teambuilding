import { cookies } from 'next/headers';
import { mockDb } from '@/lib/db/mock';
import { hashPassword, verifyPassword } from './hash';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export { hashPassword, verifyPassword };

export function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function createSession(data: {
  companyId?: number;
  storeId?: number;
  roleId?: number;
  roleType?: string;
  staffId?: number;
}) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await mockDb.createSession({
    token,
    ...data,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) return null;

  return mockDb.getSessionByToken(token);
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (token) {
    await mockDb.deleteSession(token);
    cookieStore.delete('session');
  }
}

export async function validateCompanyLogin(name: string, password: string) {
  const company = await mockDb.getCompanyByName(name);
  
  if (!company) return null;

  const isValid = await verifyPassword(password, company.passwordHash);
  return isValid ? company : null;
}

export async function validateStoreAccess(storeId: number, storePassword?: string) {
  const store = await mockDb.getStoreById(storeId);
  
  if (!store) return false;

  if (store.requireStorePassword && store.storePasswordHash) {
    if (!storePassword) return false;
    return verifyPassword(storePassword, store.storePasswordHash);
  }

  return true;
}

export async function validateRolePin(storeId: number, roleType: string, pin?: string) {
  if (roleType === 'staff') return true; // Staff doesn't require PIN

  const role = await mockDb.getRoleByStoreAndType(storeId, roleType);
  
  if (!role || !role.passwordHash) return false;
  if (!pin) return false;

  return verifyPassword(pin, role.passwordHash);
}