import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;
let currentStorageKey: string | null = null; // 追蹤當前的 storage key

// Supabase 連線資訊從 localStorage 讀取
// 遵循 Guidelines.md 禁止 1：不使用 import.meta.env
export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = localStorage.getItem('supabase_url') || '';
  const supabaseAnonKey = localStorage.getItem('supabase_anon_key') || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 連線資訊未設定。請先在系統設定中配置 Supabase URL 和 Anon Key。');
  }

  const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || 'default';
  const storageKey = `sb-${projectId}-auth-token`;

  // 如果連線資訊改變或 storage key 改變，重置實例
  const configChanged = currentUrl !== supabaseUrl || currentKey !== supabaseAnonKey || currentStorageKey !== storageKey;
  
  if (configChanged && supabaseInstance) {
    console.log('🔄 Supabase 連線資訊已改變，重置舊的 Client 實例');
    // 清理舊實例（避免多個實例）
    supabaseInstance = null;
    currentUrl = null;
    currentKey = null;
    currentStorageKey = null;
  }

  // Singleton: 只創建一次實例
  if (!supabaseInstance) {
    console.log(`✅ 創建 Supabase Client (Singleton)`);
    console.log(`   - Project ID: ${projectId}`);
    console.log(`   - Storage Key: ${storageKey}`);
    
    currentUrl = supabaseUrl;
    currentKey = supabaseAnonKey;
    currentStorageKey = storageKey;
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // 使用唯一的 storage key，避免多個實例衝突
        storageKey: storageKey,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // 關閉 URL session 偵測，避免多餘的請求
      },
    });
  }

  return supabaseInstance;
}

// Helper function to check if Supabase is configured
export function hasSupabaseConfig(): boolean {
  const supabaseUrl = localStorage.getItem('supabase_url');
  const supabaseAnonKey = localStorage.getItem('supabase_anon_key');
  return !!(supabaseUrl && supabaseAnonKey);
}

// Helper function to reset the Supabase client (for mode switching)
export function resetSupabaseClient(): void {
  if (supabaseInstance) {
    console.log('🔄 重置 Supabase Client 實例');
  }
  supabaseInstance = null;
  currentUrl = null;
  currentKey = null;
  currentStorageKey = null;
}