import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

// Service Role Clientを使用（バックエンド用）
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Storage bucket names
export const STORAGE_BUCKET = 'daily-reports';
export const INTERVIEW_BUCKET = 'daily-reports'; // Use same bucket for PDFs

// Helper functions for storage operations
export const uploadImage = async (
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error('Upload exception:', error);
    return null;
  }
};

export const deleteImage = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete exception:', error);
    return false;
  }
};

export const getPublicUrl = (path: string, bucket: string = STORAGE_BUCKET): string => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

// Upload PDF to interview bucket
export const uploadPdf = async (
  file: Buffer,
  fileName: string
): Promise<string | null> => {
  try {
    // PDFを専用フォルダに保存
    const pdfPath = `interview-pdfs/${fileName}`;
    const { data, error } = await supabase.storage
      .from(INTERVIEW_BUCKET)
      .upload(pdfPath, file, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) {
      console.error('PDF upload error:', error);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error('PDF upload exception:', error);
    return null;
  }
};

// List images older than specified days
export const listOldImages = async (days: number): Promise<string[]> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('', {
        limit: 1000,
        offset: 0,
      });

    if (error) {
      console.error('List error:', error);
      return [];
    }

    // Filter images older than cutoff date
    const oldImages = data
      .filter(file => {
        if (file.created_at) {
          const createdDate = new Date(file.created_at);
          return createdDate < cutoffDate;
        }
        return false;
      })
      .map(file => file.name);

    return oldImages;
  } catch (error) {
    console.error('List exception:', error);
    return [];
  }
};