import axios from 'axios';

const ADMIN_API_URL = 'http://localhost:3100/api';
const MAIN_APP_URL = 'http://localhost:3000';

export interface Company {
  id: string;
  name: string;
  apiKey: string;
  isActive: boolean;
}

export interface LoginResponse {
  success: boolean;
  company?: Company;
  redirectUrl?: string;
  error?: string;
}

class CompanyAPI {
  // Verify company credentials with admin dashboard
  async verifyCompany(name: string, password: string): Promise<LoginResponse> {
    try {
      // In production, this would connect to the admin dashboard API
      // For now, we'll simulate the verification
      
      // Mock verification - in production this would call the admin dashboard
      if (name === 'デモ会社' && password === 'demo123') {
        return {
          success: true,
          company: {
            id: '1',
            name: 'デモ会社',
            apiKey: 'demo-api-key-123',
            isActive: true,
          },
          redirectUrl: `${MAIN_APP_URL}/company/${encodeURIComponent('1')}/stores`,
        };
      }
      
      return {
        success: false,
        error: '会社名またはパスワードが正しくありません',
      };
    } catch (error) {
      console.error('Verification error:', error);
      return {
        success: false,
        error: 'サーバーエラーが発生しました',
      };
    }
  }
  
  // Generate session token for authenticated company
  generateSessionToken(company: Company): string {
    // In production, this would generate a JWT or secure session token
    const token = btoa(JSON.stringify({
      companyId: company.id,
      companyName: company.name,
      apiKey: company.apiKey,
      timestamp: Date.now(),
    }));
    
    return token;
  }
  
  // Store session in localStorage
  storeSession(company: Company, token: string): void {
    localStorage.setItem('companySession', JSON.stringify({
      company,
      token,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    }));
  }
  
  // Check if company is already logged in
  getStoredSession(): { company: Company; token: string } | null {
    const stored = localStorage.getItem('companySession');
    if (!stored) return null;
    
    try {
      const session = JSON.parse(stored);
      
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem('companySession');
        return null;
      }
      
      return {
        company: session.company,
        token: session.token,
      };
    } catch {
      return null;
    }
  }
  
  // Clear session
  clearSession(): void {
    localStorage.removeItem('companySession');
  }
}

export const api = new CompanyAPI();