import { StorageFactory } from '@/lib/storage/StorageFactory'

// 使用 StorageFactory 的 getAdapter() 方法獲取儲存適配器
// StorageFactory 會自動根據 localStorage 中的 Supabase 配置決定使用 Local 或 Supabase 模式
export const apiClient = StorageFactory.getAdapter()
