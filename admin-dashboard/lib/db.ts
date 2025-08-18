import bcrypt from 'bcryptjs';

export interface Company {
  id: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  stores: Store[];
  apiKey: string;
  isActive: boolean;
}

export interface Store {
  id: string;
  companyId: string;
  name: string;
  requireStorePassword: boolean;
  storePasswordHash?: string;
}

// In-memory database for admin dashboard
class AdminDatabase {
  private companies: Map<string, Company> = new Map();
  private stores: Map<string, Store> = new Map();

  constructor() {
    // Initialize with demo data
    const demoCompany: Company = {
      id: '1',
      name: 'デモ会社',
      passwordHash: bcrypt.hashSync('demo123', 10),
      createdAt: new Date(),
      stores: [],
      apiKey: 'demo-api-key-123',
      isActive: true,
    };
    
    this.companies.set(demoCompany.id, demoCompany);
    
    // Add demo stores
    const stores: Store[] = [
      {
        id: '1-1',
        companyId: '1',
        name: '渋谷店',
        requireStorePassword: false,
      },
      {
        id: '1-2',
        companyId: '1',
        name: '新宿店',
        requireStorePassword: true,
        storePasswordHash: bcrypt.hashSync('store123', 10),
      },
    ];
    
    stores.forEach(store => {
      this.stores.set(store.id, store);
      demoCompany.stores.push(store);
    });
  }

  // Company operations
  getAllCompanies(): Company[] {
    return Array.from(this.companies.values());
  }

  getCompany(id: string): Company | undefined {
    return this.companies.get(id);
  }

  createCompany(name: string, password: string): Company {
    const id = Date.now().toString();
    const company: Company = {
      id,
      name,
      passwordHash: bcrypt.hashSync(password, 10),
      createdAt: new Date(),
      stores: [],
      apiKey: `api-key-${id}-${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
    };
    
    this.companies.set(id, company);
    return company;
  }

  updateCompany(id: string, updates: Partial<Company>): Company | null {
    const company = this.companies.get(id);
    if (!company) return null;
    
    const updated = { ...company, ...updates };
    this.companies.set(id, updated);
    return updated;
  }

  deleteCompany(id: string): boolean {
    // Delete all stores first
    const company = this.companies.get(id);
    if (company) {
      company.stores.forEach(store => {
        this.stores.delete(store.id);
      });
    }
    return this.companies.delete(id);
  }

  toggleCompanyStatus(id: string): Company | null {
    const company = this.companies.get(id);
    if (!company) return null;
    
    company.isActive = !company.isActive;
    this.companies.set(id, company);
    return company;
  }

  // Store operations
  createStore(companyId: string, name: string, requirePassword: boolean, password?: string): Store | null {
    const company = this.companies.get(companyId);
    if (!company) return null;
    
    const id = `${companyId}-${Date.now()}`;
    const store: Store = {
      id,
      companyId,
      name,
      requireStorePassword: requirePassword,
      storePasswordHash: password ? bcrypt.hashSync(password, 10) : undefined,
    };
    
    this.stores.set(id, store);
    company.stores.push(store);
    return store;
  }

  deleteStore(storeId: string): boolean {
    const store = this.stores.get(storeId);
    if (!store) return false;
    
    const company = this.companies.get(store.companyId);
    if (company) {
      company.stores = company.stores.filter(s => s.id !== storeId);
    }
    
    return this.stores.delete(storeId);
  }

  // Authentication
  validateAdminSecret(secret: string): boolean {
    return secret === process.env.ADMIN_SECRET || secret === 'admin-secret-2024';
  }
}

export const db = new AdminDatabase();