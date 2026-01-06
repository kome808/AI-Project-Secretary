import { StorageAdapter } from './types';
import { LocalAdapter } from './LocalAdapter';
import { SupabaseAdapter } from './SupabaseAdapter';
import { hasSupabaseConfig, resetSupabaseClient } from '../supabase/client';

export class StorageFactory {
  private static instance: StorageAdapter | null = null;
  private static currentMode: 'local' | 'supabase' | null = null;
  private static supabaseAdapterInstance: SupabaseAdapter | null = null; // 額外儲存 SupabaseAdapter 單例

  private constructor() {}

  public static getAdapter(): StorageAdapter {
    const hasSupabase = hasSupabaseConfig();
    const targetMode = hasSupabase ? 'supabase' : 'local';

    // 只有在模式改變時才重新創建實例
    if (!StorageFactory.instance || StorageFactory.currentMode !== targetMode) {
      // 如果模式改變，先清理舊的 Supabase Client（如果存在）
      if (StorageFactory.currentMode === 'supabase' && targetMode !== 'supabase') {
        console.log('🔄 模式切換：從 Supabase 切回 Local，清理 Supabase Client');
        resetSupabaseClient();
        StorageFactory.supabaseAdapterInstance = null; // 清除 SupabaseAdapter 單例
      }
      
      if (hasSupabase) {
        console.log('✅ Supabase 已設定，使用 SupabaseAdapter');
        
        // 確保全域只有一個 SupabaseAdapter 實例���關鍵修改！）
        if (!StorageFactory.supabaseAdapterInstance) {
          console.log('🆕 創建新的 SupabaseAdapter 實例（單例）');
          StorageFactory.supabaseAdapterInstance = new SupabaseAdapter();
        } else {
          console.log('♻️  重用現有的 SupabaseAdapter 實例（單例模式）');
        }
        
        StorageFactory.instance = StorageFactory.supabaseAdapterInstance;
        StorageFactory.currentMode = 'supabase';
      } else {
        console.log('📦 使用 LocalAdapter (Local Phase)');
        StorageFactory.instance = new LocalAdapter();
        StorageFactory.currentMode = 'local';
      }
    }

    return StorageFactory.instance;
  }

  // Helper method to reset the instance (useful for testing or explicit mode switching)
  public static resetInstance(): void {
    console.log('🔄 StorageFactory.resetInstance() 被調用');
    StorageFactory.instance = null;
    StorageFactory.currentMode = null;
    StorageFactory.supabaseAdapterInstance = null; // 清除 SupabaseAdapter 單例
    resetSupabaseClient(); // 同時重置 Supabase Client
  }
}