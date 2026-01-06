/**
 * 狀態遷移工具 - Console 快速執行版
 * 
 * 使用方式：
 * 1. 打開瀏覽器 Console（F12）
 * 2. 複製整個檔案內容並貼上
 * 3. 按 Enter 執行
 * 
 * 或直接執行：
 * fetch('/migrate-status.js').then(r => r.text()).then(eval);
 */

(function() {
  console.log('🔄 開始狀態遷移...\n');
  
  // 舊狀態對應表
  const MIGRATION_MAP = {
    // 通用舊狀態
    'open': 'not_started',
    'active': 'in_progress',
    'done': 'completed',
    'pending': 'awaiting_response',
    'waiting': 'awaiting_response',
    'archived': 'completed',
    
    // CR (Change Request) 舊狀態
    'requested': 'in_progress',
    'reviewing': 'in_progress',
    'approved': 'completed',
    'rejected': 'completed',
    'implemented': 'completed',
    'canceled': 'completed',
    
    // Decision 舊狀態
    'superseded': 'completed',
    'deprecated': 'completed',
  };
  
  let totalUpdated = 0;
  
  // === 1. 遷移 Items ===
  console.log('📋 步驟 1/3: 遷移 Items...');
  let itemsUpdated = 0;
  
  Object.keys(localStorage)
    .filter(key => key.startsWith('items_'))
    .forEach(key => {
      try {
        const items = JSON.parse(localStorage.getItem(key));
        let changed = false;
        
        items.forEach(item => {
          if (item.status in MIGRATION_MAP) {
            const oldStatus = item.status;
            item.status = MIGRATION_MAP[oldStatus];
            console.log(`  ✅ Item "${item.title}": ${oldStatus} → ${item.status}`);
            changed = true;
            itemsUpdated++;
          }
        });
        
        if (changed) {
          localStorage.setItem(key, JSON.stringify(items));
        }
      } catch (error) {
        console.error(`  ❌ 錯誤處理 ${key}:`, error);
      }
    });
  
  console.log(`✅ Items 遷移完成：${itemsUpdated} 筆更新\n`);
  totalUpdated += itemsUpdated;
  
  // === 2. 遷移 Work Packages ===
  console.log('📦 步驟 2/3: 遷移 Work Packages...');
  let wpUpdated = 0;
  
  Object.keys(localStorage)
    .filter(key => key.startsWith('work_packages_'))
    .forEach(key => {
      try {
        const wps = JSON.parse(localStorage.getItem(key));
        let changed = false;
        
        wps.forEach(wp => {
          if (wp.status in MIGRATION_MAP) {
            const oldStatus = wp.status;
            wp.status = MIGRATION_MAP[oldStatus];
            console.log(`  ✅ WorkPackage "${wp.title}": ${oldStatus} → ${wp.status}`);
            changed = true;
            wpUpdated++;
          }
        });
        
        if (changed) {
          localStorage.setItem(key, JSON.stringify(wps));
        }
      } catch (error) {
        console.error(`  ❌ 錯誤處理 ${key}:`, error);
      }
    });
  
  console.log(`✅ Work Packages 遷移完成：${wpUpdated} 筆更新\n`);
  totalUpdated += wpUpdated;
  
  // === 3. 設定遷移完成標記 ===
  console.log('🏁 步驟 3/3: 設定完成標記...');
  localStorage.setItem('status_migration_completed', 'true');
  console.log('✅ 已設定遷移完成標記\n');
  
  // === 總結 ===
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎉 遷移完成！`);
  console.log(`   總共更新：${totalUpdated} 筆資料`);
  console.log(`   - Items: ${itemsUpdated} 筆`);
  console.log(`   - Work Packages: ${wpUpdated} 筆`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (totalUpdated > 0) {
    console.log('🔄 3 秒後自動重新整理頁面...');
    setTimeout(() => {
      console.log('🔃 重新整理中...');
      location.reload();
    }, 3000);
  } else {
    console.log('✨ 沒有需要遷移的資料，系統已是最新狀態！');
  }
  
  // 返回統計資料
  return {
    success: true,
    totalUpdated,
    itemsUpdated,
    wpUpdated,
    migrationMap: MIGRATION_MAP
  };
})();
