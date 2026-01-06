/**
 * ID 格式轉換工具
 * 
 * 用於處理 Local Phase 與 Supabase 之間的 ID 格式差異
 * - Local Phase: 使用自訂字串 ID (例如: proj_nmth_001)
 * - Supabase: 使用 UUID (例如: 550e8400-e29b-41d4-a716-446655440000)
 */

/**
 * 檢查字串是否為有效的 UUID 格式
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * 檢查是否為 Local Phase 的 ID 格式
 */
export function isLocalPhaseId(id: string): boolean {
  // Local Phase ID 格式: proj_*, member_*, item_*, module_*, inbox_*
  const localIdPrefixes = ['proj_', 'member_', 'item_', 'module_', 'inbox_', 'artifact_', 'user_'];
  return localIdPrefixes.some(prefix => id.startsWith(prefix));
}

/**
 * 將 Local Phase ID 轉換為 UUID
 * 
 * 策略：使用確定性演算法，相同的 Local ID 總是產生相同的 UUID
 * 這樣可以確保在重複轉換時保持一致性
 */
export function localIdToUUID(localId: string): string {
  // 如果已經是 UUID，直接返回
  if (isValidUUID(localId)) {
    return localId;
  }

  // 簡單的雜湊函數：將字串轉換為數字
  let hash = 0;
  for (let i = 0; i < localId.length; i++) {
    const char = localId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // 將 hash 轉換為正數
  const positiveHash = Math.abs(hash);

  // 產生 UUID 格式的字串
  // 注意：這不是真正的 UUID v4，但格式相容
  const hex = positiveHash.toString(16).padStart(8, '0');
  const uuid = `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(0, 3)}-${hex.slice(0, 4)}-${hex.padEnd(12, '0').slice(0, 12)}`;
  
  return uuid;
}

/**
 * 記錄 ID 對應關係（用於除錯）
 */
const idMappingCache = new Map<string, string>();

export function getOrCreateUUID(localId: string): string {
  if (isValidUUID(localId)) {
    return localId;
  }

  // 檢查快取
  if (idMappingCache.has(localId)) {
    return idMappingCache.get(localId)!;
  }

  // 產生新的 UUID
  const uuid = localIdToUUID(localId);
  idMappingCache.set(localId, uuid);

  console.log(`[ID Mapping] ${localId} → ${uuid}`);

  return uuid;
}

/**
 * 清除 ID 對應快取
 */
export function clearIdMappingCache(): void {
  idMappingCache.clear();
}
