/**
 * 測試資料種子檔案
 * 用於初始化「國美館台灣美術知識庫系統」的完整測試資料
 */

import { 
  Project, 
  Member, 
  Artifact, 
  Item, 
  WorkPackage,
  Suggestion 
} from './types';

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * 清除所有 localStorage 資料
 */
export function clearAllData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('✓ 已清除所有 localStorage 資料');
}

/**
 * 建立測試資料
 */
export function seedNMTCData(): void {
  clearAllData();
  
  const now = new Date().toISOString();
  const projectId = generateId();
  
  // 1. 建立專案
  const project: Project = {
    id: projectId,
    name: '國美館台灣美術知識庫系統',
    description: '建置台灣美術史數位資料庫，整合藝術家資料、作品圖檔、展覽紀錄與學術研究文獻，提供公眾查詢與研究使用',
    created_at: now,
    owner_id: 'owner-001',
    meta: {
      client: '國立台灣美術館',
      phase: '第一期開發',
      start_date: '2024-01-15',
      target_date: '2024-12-31'
    }
  };
  
  // 2. 建立成員
  const members: Member[] = [
    {
      id: 'member-001',
      project_id: projectId,
      name: '王雅婷',
      email: 'wang.yating@nmtc.gov.tw',
      role: 'pm',
      avatar_url: undefined,
      created_at: now
    },
    {
      id: 'member-002',
      project_id: projectId,
      name: '林建志',
      email: 'lin.jianzhi@devteam.com',
      role: 'developer',
      avatar_url: undefined,
      created_at: now
    },
    {
      id: 'member-003',
      project_id: projectId,
      name: '陳美玲',
      email: 'chen.meiling@nmtc.gov.tw',
      role: 'client',
      avatar_url: undefined,
      created_at: now
    },
    {
      id: 'member-004',
      project_id: projectId,
      name: '張文傑',
      email: 'zhang.wenjie@devteam.com',
      role: 'developer',
      avatar_url: undefined,
      created_at: now
    },
    {
      id: 'member-005',
      project_id: projectId,
      name: '李曉雯',
      email: 'li.xiaowen@design.com',
      role: 'viewer',
      avatar_url: undefined,
      created_at: now
    }
  ];
  
  // 3. 建立文件庫資料
  const artifacts: Artifact[] = [
    {
      id: 'artifact-001',
      project_id: projectId,
      content_type: 'text/plain',
      original_content: '專案啟動會議紀錄\n\n日期：2024年1月15日\n地點：國美館會議室\n\n主席：王雅婷\n出席：陳美玲、林建志、張文傑、李曉雯\n\n討論事項：\n1. 確認系統開發範圍與功能需求\n2. 藝術家資料欄位規格討論\n3. 圖檔上傳與管理流程\n4. 權限分級機制\n5. 第一期開發時程確認\n\n決議事項：\n- 採用 RWD 設計，支援行動裝置瀏覽\n- 藝術家資料包含：姓名、生卒年、流派、代表作品、生平簡介\n- 圖檔需支援高解析度原檔與縮圖預覽\n- 分為管理員、編輯者、一般使用者三種權限\n- 第一期預計 2024/12/31 完成上線',
      masked_content: '專案啟動會議紀錄\n\n日期：2024年1月15日\n地點：國美館會議室\n\n主席：王雅婷\n出席：陳美玲、林建志、張文傑、李曉雯\n\n討論事項：\n1. 確認系統開發範圍與功能需求\n2. 藝術家資料欄位規格討論\n3. 圖檔上傳與管理流程\n4. 權限分級機制\n5. 第一期開發時程確認\n\n決議事項：\n- 採用 RWD 設計，支援行動裝置瀏覽\n- 藝術家資料包含：姓名、生卒年、流派、代表作品、生平簡介\n- 圖檔需支援高解析度原檔與縮圖預覽\n- 分為管理員、編輯者、一般使用者三種權限\n- 第一期預計 2024/12/31 完成上線',
      created_at: '2024-01-15T10:00:00Z',
      meta: {
        channel: 'meeting',
        source_info: '專案啟動會議 2024/01/15'
      }
    },
    {
      id: 'artifact-002',
      project_id: projectId,
      content_type: 'text/conversation',
      original_content: '[2024/02/10 14:23] 陳美玲：\n關於藝術家資料的「流派」欄位，我們需要建立一個標準分類表嗎？\n\n[2024/02/10 14:25] 王雅婷：\n是的，建議參考學界常用分類：印象派、立體派、抽象表現主義、台灣現代美術運動等\n\n[2024/02/10 14:27] 陳美玲：\n好的，我會整理一份完整清單給開發團隊\n\n[2024/02/10 14:30] 林建志：\n那這個會是下拉選單還是可以自由輸入？\n\n[2024/02/10 14:32] 王雅婷：\n建議採用「預設選項 + 自訂輸入」的方式，保持彈性',
      masked_content: '[2024/02/10 14:23] 陳美玲：\n關於藝術家資料的「流派」欄位，我們需要建立一個標準分類表嗎？\n\n[2024/02/10 14:25] 王雅婷：\n是的，建議參考學界常用分類：印象派、立體派、抽象表現主義、台灣現代美術運動等\n\n[2024/02/10 14:27] 陳美玲：\n好的，我會整理一份完整清單給開發團隊\n\n[2024/02/10 14:30] 林建志：\n那這個會是下拉選單還是可以自由輸入？\n\n[2024/02/10 14:32] 王雅婷：\n建議採用「預設選項 + 自訂輸入」的方式，保持彈性',
      created_at: '2024-02-10T06:23:00Z',
      meta: {
        channel: 'line',
        source_info: 'LINE 群組討論 - 流派分類'
      }
    },
    {
      id: 'artifact-003',
      project_id: projectId,
      content_type: 'text/uri-list',
      original_content: 'https://www.ntmofa.gov.tw/information_1050_141362.html',
      masked_content: 'https://www.ntmofa.gov.tw/information_1050_141362.html',
      created_at: '2024-02-15T03:00:00Z',
      meta: {
        channel: 'paste',
        source_info: '國美館典藏品查詢系統參考'
      }
    },
    {
      id: 'artifact-004',
      project_id: projectId,
      content_type: 'text/markdown',
      original_content: `# 圖檔管理需求規格

## 上傳規格
- 支援格式：JPG, PNG, TIFF
- 檔案大小：單檔最大 50MB
- 解析度要求：最低 300 DPI

## 儲存策略
- 原始檔案：完整保留，供下載使用
- 預覽檔：自動產生 1200x800 縮圖
- 縮圖：自動產生 300x200 縮圖（列表顯示用）

## 權限控制
- 一般使用者：僅能瀏覽預覽檔
- 編輯者：可上傳、編輯資料
- 管理員：可下載原始檔

## 浮水印
- 預覽檔需加入「國立台灣美術館典藏」浮水印
- 原始檔不加浮水印`,
      masked_content: `# 圖檔管理需求規格

## 上傳規格
- 支援格式：JPG, PNG, TIFF
- 檔案大小：單檔最大 50MB
- 解析度要求：最低 300 DPI

## 儲存策略
- 原始檔案：完整保留，供下載使用
- 預覽檔：自動產生 1200x800 縮圖
- 縮圖：自動產生 300x200 縮圖（列表顯示用）

## 權限控制
- 一般使用者：僅能瀏覽預覽檔
- 編輯者：可上傳、編輯資料
- 管理員：可下載原始檔

## 浮水印
- 預覽檔需加入「國立台灣美術館典藏」浮水印
- 原始檔不加浮水印`,
      created_at: '2024-02-20T02:30:00Z',
      meta: {
        channel: 'upload',
        source_info: '圖檔管理需求.md',
        file_name: '圖檔管理需求.md',
        file_size: 456,
        file_type: 'text/markdown'
      }
    },
    {
      id: 'artifact-005',
      project_id: projectId,
      content_type: 'text/plain',
      original_content: 'Email from: 陳美玲 <chen.meiling@nmtc.gov.tw>\nSubject: 關於資料庫欄位補充\n\n雅婷妳好，\n\n針對上次會議討論的藝術家資料欄位，我這邊補充幾個重要項目：\n\n1. 需要增加「別名」欄位（很多藝術家有筆名或藝名）\n2. 「作品年代」建議使用西元年，方便排序\n3. 展覽紀錄需要能關聯到展覽資料表\n4. 參考資料來源欄位（書目、期刊、網站等）\n\n另外，我們館內現有約 5,000 筆藝術家資料需要匯入，\n請開發團隊評估資料匯入功能的優先順序。\n\n謝謝！\n陳美玲',
      masked_content: 'Email from: 陳美玲 <chen.meiling@nmtc.gov.tw>\nSubject: 關於資料庫欄位補充\n\n雅婷妳好，\n\n針對上次會議討論的藝術家資料欄位，我這邊補充幾個重要項目：\n\n1. 需要增加「別名」欄位（很多藝術家有筆名或藝名）\n2. 「作品年代」建議使用西元年，方便排序\n3. 展覽紀錄需要能關聯到展覽資料表\n4. 參考資料來源欄位（書目、期刊、網站等）\n\n另外，我們館內現有約 5,000 筆藝術家資料需要匯入，\n請開發團隊評估資料匯入功能的優先順序。\n\n謝謝！\n陳美玲',
      created_at: '2024-03-01T01:15:00Z',
      meta: {
        channel: 'email',
        source_info: 'Email - 資料庫欄位補充需求'
      }
    }
  ];
  
  // 4. 建立專案工作（Work Packages）
  const workPackages: WorkPackage[] = [
    {
      id: 'wp-001',
      project_id: projectId,
      title: '藝術家資料管理模組',
      description: '建立藝術家基本資料的新增、編輯、查詢功能',
      status: 'in_progress',
      owner_id: 'member-002',
      target_date: '2024-06-30',
      created_at: '2024-02-01T00:00:00Z',
      updated_at: '2024-03-15T00:00:00Z'
    },
    {
      id: 'wp-002',
      project_id: projectId,
      title: '作品圖檔管理系統',
      description: '圖檔上傳、縮圖產生、浮水印處理與權限控制',
      status: 'in_progress',
      owner_id: 'member-004',
      target_date: '2024-07-31',
      created_at: '2024-02-15T00:00:00Z',
      updated_at: '2024-03-10T00:00:00Z'
    },
    {
      id: 'wp-003',
      project_id: projectId,
      title: '公眾查詢介面',
      description: '前台查詢系統，支援關鍵字搜尋、分類瀏覽、進階篩選',
      status: 'not_started',
      owner_id: 'member-002',
      target_date: '2024-09-30',
      created_at: '2024-03-01T00:00:00Z',
      updated_at: '2024-03-01T00:00:00Z'
    },
    {
      id: 'wp-004',
      project_id: projectId,
      title: '資料匯入工具',
      description: '批次匯入現有 5,000 筆藝術家資料',
      status: 'planning',
      owner_id: 'member-004',
      target_date: '2024-08-31',
      created_at: '2024-03-05T00:00:00Z',
      updated_at: '2024-03-05T00:00:00Z'
    }
  ];
  
  // 5. 建立任務項目（Items）
  const items: Item[] = [
    // 藝術家資料管理模組的任務
    {
      id: 'item-001',
      project_id: projectId,
      type: 'general',
      status: 'completed',
      title: '設計藝術家資料表結構',
      description: '包含姓名、生卒年、流派、別名等欄位',
      assignee_id: 'member-002',
      created_at: '2024-02-05T00:00:00Z',
      updated_at: '2024-02-20T00:00:00Z',
      due_date: '2024-02-20',
      work_package_id: 'wp-001',
      source_artifact_id: 'artifact-001'
    },
    {
      id: 'item-002',
      project_id: projectId,
      type: 'general',
      status: 'in_progress',
      title: '實作藝術家資料 CRUD API',
      description: '完成新增、查詢、修改、刪除功能',
      assignee_id: 'member-002',
      created_at: '2024-02-21T00:00:00Z',
      updated_at: '2024-03-15T00:00:00Z',
      due_date: '2024-12-10',
      work_package_id: 'wp-001'
    },
    {
      id: 'item-003',
      project_id: projectId,
      type: 'general',
      status: 'blocked',
      title: '建立流派分類標準表',
      description: '整理台灣美術史常用流派分類',
      assignee_id: 'member-003',
      created_at: '2024-02-12T00:00:00Z',
      updated_at: '2024-03-10T00:00:00Z',
      due_date: '2024-12-15',
      work_package_id: 'wp-001',
      source_artifact_id: 'artifact-002',
      tags: ['需求確認']
    },
    {
      id: 'item-004',
      project_id: projectId,
      type: 'general',
      status: 'not_started',
      title: '確認別名欄位是否支援多筆',
      description: '部分藝術家可能有多個別名，需要確認資料結構',
      assignee_id: 'member-003',
      created_at: '2024-03-02T00:00:00Z',
      updated_at: '2024-03-02T00:00:00Z',
      work_package_id: 'wp-001',
      source_artifact_id: 'artifact-005'
    },
    
    // 圖檔管理系統的任務
    {
      id: 'item-005',
      project_id: projectId,
      type: 'general',
      status: 'completed',
      title: '評估圖檔儲存方案',
      description: '比較 AWS S3、Azure Blob、自建 NAS 的優缺點',
      assignee_id: 'member-004',
      created_at: '2024-02-16T00:00:00Z',
      updated_at: '2024-03-01T00:00:00Z',
      due_date: '2024-03-01',
      work_package_id: 'wp-002'
    },
    {
      id: 'item-006',
      project_id: projectId,
      type: 'general',
      status: 'not_started',
      title: '決定圖檔儲存方案',
      description: '根據成本、效能、維護難度選擇儲存方案',
      assignee_id: 'member-001',
      created_at: '2024-03-02T00:00:00Z',
      updated_at: '2024-03-02T00:00:00Z',
      work_package_id: 'wp-002'
    },
    {
      id: 'item-007',
      project_id: projectId,
      type: 'general',
      status: 'in_progress',
      title: '實作圖檔上傳功能',
      description: '包含檔案驗證、進度顯示、錯誤處理',
      assignee_id: 'member-004',
      created_at: '2024-03-05T00:00:00Z',
      updated_at: '2024-03-20T00:00:00Z',
      due_date: '2024-04-30',
      work_package_id: 'wp-002',
      source_artifact_id: 'artifact-004'
    },
    {
      id: 'item-008',
      project_id: projectId,
      type: 'general',
      status: 'not_started',
      title: '開發自動縮圖產生功能',
      description: '上傳後自動產生預覽檔與縮圖',
      assignee_id: 'member-004',
      created_at: '2024-03-06T00:00:00Z',
      updated_at: '2024-03-06T00:00:00Z',
      due_date: '2024-05-15',
      work_package_id: 'wp-002',
      source_artifact_id: 'artifact-004'
    },
    {
      id: 'item-009',
      project_id: projectId,
      type: 'general',
      status: 'not_started',
      title: '實作浮水印加註功能',
      description: '預覽檔自動加入國美館浮水印',
      assignee_id: 'member-004',
      created_at: '2024-03-06T00:00:00Z',
      updated_at: '2024-03-06T00:00:00Z',
      due_date: '2024-05-30',
      work_package_id: 'wp-002',
      source_artifact_id: 'artifact-004'
    },
    
    // 公眾查詢介面的任務
    {
      id: 'item-010',
      project_id: projectId,
      type: 'general',
      status: 'not_started',
      title: '設計查詢介面 Wireframe',
      description: '繪製首頁、搜尋結果頁、詳細頁的版面配置',
      assignee_id: 'member-005',
      created_at: '2024-03-10T00:00:00Z',
      updated_at: '2024-03-10T00:00:00Z',
      due_date: '2024-04-15',
      work_package_id: 'wp-003'
    },
    {
      id: 'item-011',
      project_id: projectId,
      type: 'general',
      status: 'not_started',
      title: '確認進階搜尋需要哪些篩選條件',
      description: '例如：年代、流派、媒材、尺寸等',
      assignee_id: 'member-003',
      created_at: '2024-03-12T00:00:00Z',
      updated_at: '2024-03-12T00:00:00Z',
      work_package_id: 'wp-003'
    },
    
    // 資料匯入工具的任務
    {
      id: 'item-012',
      project_id: projectId,
      type: 'general',
      status: 'not_started',
      title: '分析現有 Excel 資料格式',
      description: '了解現有 5,000 筆資料的欄位結構與品質',
      assignee_id: 'member-002',
      created_at: '2024-03-08T00:00:00Z',
      updated_at: '2024-03-08T00:00:00Z',
      due_date: '2024-03-31',
      work_package_id: 'wp-004',
      source_artifact_id: 'artifact-005'
    },
    {
      id: 'item-013',
      project_id: projectId,
      type: 'general',
      status: 'not_started',
      title: '新增批次匯入功能需求',
      description: '原規格未包含批次匯入，需評估工作量與排程',
      assignee_id: 'member-001',
      created_at: '2024-03-09T00:00:00Z',
      updated_at: '2024-03-09T00:00:00Z',
      work_package_id: 'wp-004',
      source_artifact_id: 'artifact-005'
    },
    
    // 未分類任務
    {
      id: 'item-014',
      project_id: projectId,
      type: 'general',
      status: 'not_started',
      title: '準備使用者教育訓練教材',
      description: '撰寫操作手冊與錄製教學影片',
      assignee_id: 'member-001',
      created_at: '2024-03-15T00:00:00Z',
      updated_at: '2024-03-15T00:00:00Z',
      due_date: '2024-11-30'
    },
    {
      id: 'item-015',
      project_id: projectId,
      type: 'general',
      status: 'blocked',
      title: '開發環境資料庫連線不穩',
      description: '不定時發生連線逾時問題',
      assignee_id: 'member-004',
      created_at: '2024-03-18T00:00:00Z',
      updated_at: '2024-03-18T00:00:00Z',
      priority: 'high'
    }
  ];
  
  // 6. 建立收件匣建議卡（Suggestions）
  const suggestions: Suggestion[] = [
    {
      id: 'suggestion-001',
      project_id: projectId,
      type: 'pending',
      title: '確認是否需要「作品尺寸」欄位',
      description: 'AI 從會議紀錄中發現藝術家資料欄位討論，建議確認是否需要記錄作品尺寸資訊',
      status: 'pending',
      source_artifact_id: 'artifact-001',
      created_at: '2024-03-20T00:00:00Z',
      ai_confidence: 0.85,
      suggested_data: {
        assignee_id: 'member-003',
        waiting_on: 'client',
        expected_response: 'yes_no'
      }
    },
    {
      id: 'suggestion-002',
      project_id: projectId,
      type: 'action',
      title: '研究其他美術館的資料庫系統',
      description: 'AI 建議參考國外主要美術館（如 MoMA、Tate）的數位典藏系統作為參考',
      status: 'pending',
      created_at: '2024-03-21T00:00:00Z',
      ai_confidence: 0.72,
      suggested_data: {
        assignee_id: 'member-001',
        due_date: '2024-04-30'
      }
    },
    {
      id: 'suggestion-003',
      project_id: projectId,
      type: 'decision',
      title: '決定是否支援多國語言介面',
      description: 'AI 從專案描述分析，建議評估是否提供英文介面以利國際學者使用',
      status: 'pending',
      created_at: '2024-03-22T00:00:00Z',
      ai_confidence: 0.68,
      suggested_data: {
        assignee_id: 'member-001',
        decision_category: 'business',
        decision_scope: 'global'
      }
    }
  ];
  
  // 儲存到 localStorage
  localStorage.setItem('local_projects', JSON.stringify([project]));
  localStorage.setItem(`local_members_${projectId}`, JSON.stringify(members));
  localStorage.setItem(`local_artifacts_${projectId}`, JSON.stringify(artifacts));
  localStorage.setItem(`local_items_${projectId}`, JSON.stringify(items));
  localStorage.setItem(`local_work_packages_${projectId}`, JSON.stringify(workPackages));
  localStorage.setItem(`local_suggestions_${projectId}`, JSON.stringify(suggestions));
  
  // 設定當前專案
  localStorage.setItem('current_project_id', projectId);
  
  // 設定測試用戶
  const testUser = {
    id: 'member-001',
    name: '王雅婷',
    email: 'wang.yating@nmtc.gov.tw',
    role: 'pm'
  };
  localStorage.setItem('current_user', JSON.stringify(testUser));
  
  console.log('✓ 測試資料已建立完成！');
  console.log(`專案 ID: ${projectId}`);
  console.log(`專案名稱: ${project.name}`);
  console.log(`成員數: ${members.length}`);
  console.log(`文件數: ${artifacts.length}`);
  console.log(`任務數: ${items.length}`);
  console.log(`專案工作數: ${workPackages.length}`);
  console.log(`建議卡數: ${suggestions.length}`);
  console.log(`當前用戶: ${testUser.name} (${testUser.role})`);
}