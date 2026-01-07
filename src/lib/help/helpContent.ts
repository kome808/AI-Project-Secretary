/**
 * 新手引導說明文案集中管理
 * 包含系統介紹、功能說明、內嵌提示文案
 */

// ===== 系統簡介 =====
export const systemIntro = {
    title: 'AI 專案助理',
    subtitle: '智慧專案管理工具',
    description: `
AI 專案助理是一個智慧專案管理工具，透過 AI 協助您：

• **快速建立專案結構** - 貼上 WBS 圖片或文字，AI 自動解析為任務清單
• **追蹤任務進度** - 可視化進度統計，掌握專案全局
• **管理團隊協作** - 邀請成員、分配任務、即時同步

讓專案管理更輕鬆、更有效率！
  `.trim()
};

// ===== 功能模組說明 =====
export const moduleDescriptions = [
    {
        id: 'dashboard',
        icon: 'LayoutDashboard',
        title: '儀表板 Dashboard',
        description: '專案整體概況與統計數據',
        details: [
            '查看專案進度統計（待處理、進行中、已完成）',
            '使用 AI 快速輸入，貼上文字或圖片自動解析任務',
            '一覽專案重要指標'
        ]
    },
    {
        id: 'inbox',
        icon: 'Inbox',
        title: '收件匣 Inbox',
        description: '快速新增與整理待辦事項',
        details: [
            '快速輸入任務想法',
            '整理未分類的待辦項目',
            '拖曳到任務清單進行歸類'
        ]
    },
    {
        id: 'tasks',
        icon: 'ListTodo',
        title: '任務清單 Tasks',
        description: '結構化任務管理',
        details: [
            '多層級任務結構（主任務 → 子任務）',
            '拖曳排序與調整層級',
            '設定負責人、截止日期、優先順序'
        ]
    },
    {
        id: 'work',
        icon: 'Briefcase',
        title: '工作項目 Work',
        description: '專案工作包管理',
        details: [
            '建立工作包 (Work Package)',
            '關聯任務與追蹤進度',
            '查看地圖視圖'
        ]
    },
    {
        id: 'sources',
        icon: 'FileText',
        title: '資源庫 Sources',
        description: '文件與素材管理',
        details: [
            '上傳專案相關文件',
            '分類管理素材',
            '快速搜尋與引用'
        ]
    },
    {
        id: 'settings',
        icon: 'Settings',
        title: '設定 Settings',
        description: '專案與系統設定',
        details: [
            '專案基本資訊設定',
            '成員管理（邀請、移除）',
            'AI 參數設定（API Key、模型選擇）'
        ]
    }
];

// ===== 操作流程指引 =====
export const quickStartGuide = [
    {
        step: 1,
        title: '建立或切換專案',
        description: '點擊左上角專案選擇器，選擇現有專案或建立新專案'
    },
    {
        step: 2,
        title: '設定 AI 金鑰',
        description: '前往「設定 → AI 設定」，輸入您的 OpenAI 或 Anthropic API Key'
    },
    {
        step: 3,
        title: '使用 AI 快速建立任務',
        description: '在儀表板的「AI 快速輸入」區域，貼上 WBS 工作分解結構，AI 將自動解析為任務清單'
    },
    {
        step: 4,
        title: '管理任務',
        description: '在「任務清單」中調整任務結構、設定負責人與截止日期'
    },
    {
        step: 5,
        title: '邀請團隊成員',
        description: '前往「設定 → 專案成員」，輸入成員 Email 發送邀請'
    }
];

// ===== 內嵌提示文案 =====
export const tooltips = {
    // Dashboard
    dashboard: {
        stats: '顯示當前專案的任務統計，包含待處理、進行中、已完成的數量',
        aiInput: '貼上 WBS 工作分解結構（文字或圖片），AI 將自動解析為任務清單',
        recentTasks: '顯示最近更新的任務項目'
    },

    // Inbox
    inbox: {
        quickInput: '快速輸入任務想法，按 Enter 送出。支援多行輸入（Shift+Enter 換行）',
        itemList: '尚未分類的待辦項目，可拖曳到任務清單進行歸類'
    },

    // Tasks
    tasks: {
        hierarchy: '任務支援多層級結構，拖曳可調整順序與層級',
        assignee: '點擊指定任務負責人',
        dueDate: '設定任務截止日期',
        status: '切換任務狀態：待處理、進行中、已完成'
    },

    // Work
    work: {
        workPackage: '工作包是專案的主要交付項目，可包含多個關聯任務',
        mapView: '以地圖視圖瀏覽工作項目'
    },

    // Settings
    settings: {
        projectInfo: '設定專案名稱、描述等基本資訊',
        members: '管理專案成員，邀請新成員或移除現有成員',
        aiConfig: '設定 AI 模型供應商（OpenAI/Anthropic）與 API 金鑰'
    }
};
