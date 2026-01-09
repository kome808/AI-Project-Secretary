import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;
let currentStorageKey: string | null = null; // 追蹤當前的 storage key

// Supabase 連線資訊優先從環境變數讀取（部署用），其次從 localStorage 讀取（本地開發/自定義）
export function getSupabaseClient(): SupabaseClient {
  // 優先順序：環境變數 > localStorage（Vercel 部署時環境變數已設定，使用者無需手動配置）
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 連線資訊未設定。請聯繫系統管理員或在環境變數中配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。');
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
        detectSessionInUrl: true, // 開啟以處理 OAuth/Password Reset Redirect
      },
    });
  }

  return supabaseInstance;
}

// Helper function to check if Supabase is configured
// 優先檢查環境變數（Vercel 部署），其次檢查 localStorage（本地開發）
export function hasSupabaseConfig(): boolean {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url');
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key');
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