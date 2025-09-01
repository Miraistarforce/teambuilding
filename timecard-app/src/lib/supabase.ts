import { createClient } from '@supabase/supabase-js';

// Supabase設定（環境変数から取得）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fephswmqxcopecztsxvq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlcGhzd21xeGNvcGVjenRzeHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTg2NDUsImV4cCI6MjA3MTA5NDY0NX0.k9pwFORrRic545hfcpiA-BqTFNAhmOQNoz-AYyg-DEM';

// Supabaseクライアントの作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // タイムカードアプリではセッション管理不要
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Realtime購読用のヘルパー関数
export const subscribeToTimeRecords = (
  callback: (payload: any) => void
) => {
  const channel = supabase
    .channel('timerecords-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'TimeRecord'
      },
      (payload) => {
        console.log('Realtime update received:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });

  return channel;
};

// チャンネルのクリーンアップ
export const unsubscribeChannel = (channel: any) => {
  supabase.removeChannel(channel);
};