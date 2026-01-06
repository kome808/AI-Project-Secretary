# 收件匣（Inbox）改版規劃 v2

## 改版目標
將收件匣從「表單＋列表」改造為「虛擬專案秘書的待入庫工作台」，強化 AI 秘書感、提升處理效率、降低資訊雜訊。

## 核心流程
AI 產生建議卡 → 人工 Confirm/Edit/Reject → 入庫後到任務清單追蹤

---

## 一、需要修改的功能點

### 1.1 統一分類與篩選（避免混亂）
**現狀問題：**
- 目前有兩套分類：上方 Badge Pills（InboxPage）+ 下方 Tabs（InboxList）
- 命名不一致：「待確認」vs「待回覆」、有「規則」和「問題」類型
- 造成使用者困惑

**改版目標：**
- ✅ **只保留一套分類**，統一為：`全部 / 待辦(Action) / 待回覆(Pending) / 決議(Decision) / 變更(CR)`
- ✅ 移除「規則」和「問題」獨立入口（規則視為 Decision 子類，用 tag 標示）
- ✅ 分類 UI 改為 Badge Pills 形式（參考 Dashboard 風格）

**實作細節：**
```typescript
// 標準分類定義
const INBOX_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'action', label: '待辦' },
  { value: 'pending', label: '待回覆' },
  { value: 'decision', label: '決議' },
  { value: 'cr', label: '變更' }
];
```

---

### 1.2 卡片左上改為「建議類型」而非「任務狀態」
**現狀問題：**
- SuggestionCard 左上的 Select 顯示「待辦」容易誤解為已入庫的任務狀態
- 收件匣的卡片是「建議卡（status=suggestion）」而非正式任務

**改版目標：**
- ✅ 明確標示為「建議類型」
- ✅ Select 下拉選項只保留：Action / Pending / Decision / CR（移除 rule / issue / work_package）
- ✅ 保留用戶可修改類型的能力（Confirm 時會以選定類型入庫）

**實作細節：**
```typescript
// 建議類型定義（移除 rule, issue, work_package）
const SUGGESTION_TYPES = {
  action: '待辦',
  pending: '待回覆',
  decision: '決議',
  cr: '變更'
};
```

---

### 1.3 強化 AI 秘書感：輸入區升級
**現狀問題：**
- 輸入區太像一般表單，缺乏 AI 特色
- 使用者不知道可以輸入什麼內容

**改版目標：**
- ✅ **秘書式引導文案**：
  - 主標題：「問 AI 秘書」或「AI 秘書助手」
  - 副標題：「貼上 LINE / Email / 會議記錄，我幫你整理成待辦、待回覆、決議或變更」
- ✅ **提示詞按鈕（Prompt Chips）**：
  - 整理成待辦並建議指派
  - 找出待客戶確認事項
  - 抓出決議與規則
  - 判斷是否變更需求（CR）
  - 解析 WBS / 規格書形成專案工作（選配）
- ✅ **處理狀態反饋**：
  - 分析中... (isAIProcessing)
  - 已產生 N 張建議卡
  - 請確認建議卡內容

**UI 設計：**
- 使用漸層背景卡片（參考 Dashboard AI 區塊）
- `border-primary/30 bg-gradient-to-br from-primary/5 to-transparent`
- Sparkles 圖示強化 AI 身份
- Prompt Chips 使用 `Badge variant="outline"` 可點擊

---

### 1.4 建議卡資訊升級：最小可判斷資訊
**現狀問題：**
- 卡片只顯示標題 + description + 信心度
- 無法快速判斷是否要 Confirm（缺少摘要、負責人、期限、Citation 節錄）
- 空白佔比過高

**改版目標：**
- ✅ **直接露出核心資訊**：
  - ✨ AI 摘要（一句話結論）- 新增 `meta.summary` 欄位
  - 👤 建議負責人（可空）- 現有 `assignee` 欄位
  - 📅 建議期限（可空）- 現有 `due_date` 欄位
  - 📄 Citation 節錄（來源名稱 + 1~2 行引用）- 新增 UI 顯示
  - 📊 信心度 + 「為何判斷？」展開說明 - 擴展現有功能

**新增資料結構：**
```typescript
// Item.meta 擴展
interface ItemMeta {
  confidence?: number;
  summary?: string; // 新增：一句話摘要
  reasoning?: string; // 新增：AI 判斷理由
  citations?: Array<{ // 新增：引用片段
    text: string;
    source_name?: string;
  }>;
  risk_level?: 'low' | 'medium' | 'high';
}
```

**UI 佈局調整：**
```
┌─────────────────────────────────────────┐
│ [類型 Select] [風險Badge] [信心度%]        │
├─────────────────────────────────────────┤
│ 標題（h3）                                │
│ 📝 摘要：AI 判斷這是... (一句話)            │
│ 👤 建議負責人：王工程師                     │
│ 📅 建議期限：2025/01/15                    │
│                                         │
│ 📄 來源：會議記錄.txt                      │
│    「客戶表示需要在下週前完成...」(節錄)     │
│    [為何這樣判斷？] 展開說明                 │
├─────────────────────────────────────────┤
│ [查看完整來源] │ [拒絕][編輯][確認入庫]      │
└─────────────────────────────────────────┘
```

---

### 1.5 批次處理功能
**現狀問題：**
- 一次產生多張卡片時需要逐一點擊 Confirm
- 效率低下

**改版目標：**
- ✅ **多選模式**：
  - 卡片左上角顯示 Checkbox
  - 點擊卡片空白處可切換選取狀態
- ✅ **批次工具列**（有選取時顯示）：
  - 已選取 N 張卡片
  - 批次確認入庫
  - 批次拒絕
  - 取消選取
- ✅ **批次操作確認**：
  - 批次確認前顯示 Toast 確認對話框
  - 避免誤操作

**UI 位置：**
- 批次工具列固定在篩選列下方（sticky）
- 當有選取卡片時淡入顯示

---

### 1.6 右側抽屜：查看來源不跳頁
**現狀問題：**
- 點擊「查看來源」開啟 Dialog 全螢幕遮罩
- 無法同時看到來源與建議卡
- 查看來源後容易迷失在多張卡片中

**改版目標：**
- ✅ **右側抽屜（Side Drawer）設計**：
  - 點擊「查看來源」從右側滑入抽屜（非 Dialog）
  - 寬度約 40~50% 螢幕
  - 主區域卡片列表可繼續操作
- ✅ **抽屜內容**：
  - 來源類型標籤（聊天/文件/會議記錄）
  - 原始內容全文（可捲動）
  - AI 引用片段高亮顯示
  - 同來源衍生的其他建議卡列表
  - 快速編輯建議按鈕
- ✅ **響應式設計**：
  - 桌機：右側 Drawer
  - 手機：Bottom Sheet 或全螢幕 Sheet

**技術實作：**
```typescript
// 使用 Sheet 組件（類似 Drawer）
<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
  <SheetContent side="right" className="w-[50vw] sm:max-w-[600px]">
    <ArtifactView artifactId={selectedArtifactId} />
  </SheetContent>
</Sheet>
```

---

### 1.7 重新整理行為優化
**現狀：**
- 右上角「重新整理」按鈕執行 `loadItems()` 重新載入列表

**改版建議：**
- ✅ 保持現有行為（重新載入建議卡列表）
- ✅ 改善命名：「重新整理」→「重新載入」
- ✅ 添加 Tooltip：「重新載入建議卡列表」
- 🔮 未來擴展：「重新分析」功能需要 AI 服務支援

---

## 二、UI 元件與互動細節

### 2.1 頁面整體佈局（Desktop）
```
┌─────────────────────────────────────────────────────┐
│ 📥 收件匣                          [重新載入] │
│ AI 產生建議卡，確認入庫後進行追蹤                        │
├─────────────────────────────────────────────────────┤
│ ┌─ AI 秘書助手 ────────────────────────────────┐     │
│ │ ✨ 貼上 LINE / Email / 會議記錄，我幫你整理      │     │
│ │                                              │     │
│ │ [整理待辦] [找待確認] [抓決議] [判斷CR] [解析WBS]│     │
│ │                                              │     │
│ │ [文字輸入區 + @ 提及 + 上傳 + 傳送]             │     │
│ │                                              │     │
│ │ ℹ️ AI 會分析內容並產生建議卡，請確認後入庫        │     │
│ └──────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────┤
│ 篩選：[全部(8)] [待辦(3)] [待回覆(2)] [決議(2)] [變更(1)]│
│ [🔍 搜尋框]                                         │
├─────────────────────────────────────────────────────┤
│ ⚡ 已選取 3 張卡片  [批次確認] [批次拒絕] [取消選取]     │
├─────────────────────────────────────────────────────┤
│ ┌─ 建議卡 1 ─────────────────┐ │                  │
│ │ ☑ [待辦▼] [信心度 85%]      │ │ 右側抽屜：        │
│ │ 標題...                    │ │ 來源詳細資訊       │
│ │ 摘要...                    │ │                  │
│ │ 👤 王工程師 📅 2025/01/15  │ │ [原始內容]        │
│ │ 📄 來源：會議記錄           │ │ [引用片段高亮]     │
│ │ [查看來源] [拒絕][編輯][確認] │ │ [同來源其他卡]     │
│ └───────────────────────────┘ │                  │
│ ┌─ 建議卡 2 ─────────────────┐ │                  │
│ └───────────────────────────┘ │                  │
└─────────────────────────────────────────────────────┘
```

### 2.2 AI 輸入區視覺設計
```typescript
<Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
  <CardContent className="pt-6 space-y-4">
    {/* 標題與說明 */}
    <div className="flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-primary" />
      <h3 className="text-primary">AI 秘書助手</h3>
    </div>
    <p className="text-muted-foreground">
      貼上 LINE / Email / 會議記錄，我幫你整理成待辦、待回覆、決議或變更
    </p>
    
    {/* Prompt Chips */}
    <div className="flex gap-2 flex-wrap">
      <Badge 
        variant="outline" 
        className="cursor-pointer hover:bg-primary/10 border-primary/30"
        onClick={() => handlePromptClick('整理成待辦並建議指派')}
      >
        整理待辦並建議指派
      </Badge>
      {/* ...其他 chips */}
    </div>
    
    {/* ChatInput */}
    <ChatInput 
      onSend={handleAIInput}
      isLoading={isAIProcessing}
      members={members}
      placeholder="貼上內容或上傳檔案..."
    />
    
    {/* 狀態提示 */}
    {isAIProcessing ? (
      <div className="flex items-center gap-2 p-3 rounded-[var(--radius)] bg-accent/10 text-accent">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>AI 正在分析中...</span>
      </div>
    ) : items.length > 0 && (
      <div className="flex items-center gap-2 p-3 rounded-[var(--radius)] bg-muted/30">
        <CheckCircle2 className="w-4 h-4 text-primary" />
        <span>已產生 {items.length} 張建議卡，請確認內容</span>
      </div>
    )}
  </CardContent>
</Card>
```

### 2.3 建議卡升級版佈局
```typescript
<div className="bg-card border-2 border-border rounded-[var(--radius-lg)] hover:border-accent/50 transition-all">
  {/* Header */}
  <div className="flex items-start gap-3 p-4 border-b">
    {/* 多選 Checkbox */}
    <Checkbox checked={isSelected} onCheckedChange={handleToggleSelect} />
    
    {/* 類型 Select */}
    <Select value={type} onValueChange={setType}>
      <SelectTrigger className={TYPE_COLORS[type]}>
        {TYPE_LABELS[type]}
      </SelectTrigger>
    </Select>
    
    {/* 風險 Badge */}
    {type === 'cr' && riskLevel && <Badge>{riskLevel}</Badge>}
    
    {/* 信心度 */}
    <div className="ml-auto flex items-center gap-1">
      <TrendingUp className="h-4 w-4" />
      <span>{confidence}%</span>
    </div>
  </div>
  
  {/* Body - 核心資訊 */}
  <div className="p-4 space-y-3">
    <h3>{title}</h3>
    
    {/* 摘要 */}
    {meta?.summary && (
      <div className="flex items-start gap-2 text-muted-foreground">
        <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
        <span className="text-sm">摘要：{meta.summary}</span>
      </div>
    )}
    
    {/* 建議負責人 */}
    {assignee && (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span>建議負責人：{assignee}</span>
      </div>
    )}
    
    {/* 建議期限 */}
    {due_date && (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>建議期限：{formatDate(due_date)}</span>
      </div>
    )}
    
    {/* Citation 節錄 */}
    {meta?.citations?.[0] && (
      <div className="p-3 rounded-[var(--radius)] bg-muted/30 border-l-2 border-accent">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">來源節錄</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          「{meta.citations[0].text}」
        </p>
      </div>
    )}
    
    {/* 為何這樣判斷？ */}
    {meta?.reasoning && (
      <button 
        onClick={() => setShowReasoning(!showReasoning)}
        className="text-sm text-primary hover:underline"
      >
        {showReasoning ? '收起說明' : '為何這樣判斷？'}
      </button>
    )}
    {showReasoning && (
      <p className="text-sm text-muted-foreground pl-4 border-l-2">
        {meta.reasoning}
      </p>
    )}
  </div>
  
  {/* Footer */}
  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t">
    <button onClick={() => openDrawer(source_artifact_id)}>
      <FileText className="h-4 w-4" />
      查看完整來源
    </button>
    
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={onReject}>
        <XCircle className="h-4 w-4" /> 拒絕
      </Button>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Edit2 className="h-4 w-4" /> 編輯
      </Button>
      <Button size="sm" onClick={onConfirm}>
        <CheckCircle2 className="h-4 w-4" /> 確認入庫
      </Button>
    </div>
  </div>
</div>
```

### 2.4 右側抽屜（Source Drawer）
```typescript
<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
  <SheetContent side="right" className="w-[50vw] sm:max-w-[600px] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>來源詳細資訊</SheetTitle>
      <SheetDescription>查看 AI 引用的原始內容與片段</SheetDescription>
    </SheetHeader>
    
    <div className="space-y-4 py-4">
      {/* 來源類型 */}
      <Badge>{artifact.source_type}</Badge>
      
      {/* 原始內容 */}
      <div className="space-y-2">
        <h4 className="font-medium">原始內容</h4>
        <div className="p-4 rounded-[var(--radius)] bg-muted max-h-[400px] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm">
            {artifact.original_content}
          </pre>
        </div>
      </div>
      
      {/* 引用片段高亮 */}
      <div className="space-y-2">
        <h4 className="font-medium">AI 引用片段</h4>
        {citations.map((citation, idx) => (
          <div key={idx} className="p-3 rounded-[var(--radius)] bg-accent/10 border-l-2 border-accent">
            <p className="text-sm">{citation.text}</p>
          </div>
        ))}
      </div>
      
      {/* 同來源衍生的其他卡片 */}
      <div className="space-y-2">
        <h4 className="font-medium">此來源產生的其他建議卡</h4>
        {relatedItems.map(item => (
          <div key={item.id} className="p-3 rounded-[var(--radius)] border hover:bg-muted/30">
            <div className="flex items-center gap-2">
              <Badge className={TYPE_COLORS[item.type]}>
                {TYPE_LABELS[item.type]}
              </Badge>
              <span className="text-sm">{item.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </SheetContent>
</Sheet>
```

---

## 三、資料結構更新

### 3.1 Item.meta 擴展定義
```typescript
interface ItemMeta {
  // 現有欄位
  confidence?: number; // AI 信心度 0~1
  risk_level?: 'low' | 'medium' | 'high'; // CR 風險等級
  
  // 新增欄位
  summary?: string; // AI 一句話摘要（20-50字）
  reasoning?: string; // AI 判斷理由說明（100-200字）
  citations?: Array<{ // AI 引用片段
    text: string; // 引用文字
    source_name?: string; // 來源名稱
    start_offset?: number; // 在原文中的起始位置（選配）
    end_offset?: number; // 在原文中的結束位置（選配）
  }>;
  
  // 其他現有欄位...
  [key: string]: any;
}
```

### 3.2 模擬資料範例
```typescript
// 在 LocalAdapter.createItem 或模擬資料中
const mockItem: Item = {
  id: 'item_001',
  project_id: 'proj_001',
  type: 'action',
  status: 'suggestion',
  title: '開通客戶測試環境權限',
  description: '客戶需要在本週五前進入測試環境驗收新功能',
  assignee: 'engineer@example.com',
  due_date: '2025-01-17',
  priority: 'high',
  source_artifact_id: 'artifact_001',
  meta: {
    confidence: 0.85,
    summary: 'AI 判斷：客戶要求開通測試環境存取權限，需在週五前完成',
    reasoning: '從對話中偵測到「麻煩開權限」、「測試環境」、「本週五」等關鍵字，判斷這是一個需要工程師執行的待辦任務',
    citations: [
      {
        text: '客戶：麻煩幫我們開通測試環境的權限，這週五要驗收新功能',
        source_name: '會議記錄.txt'
      }
    ]
  }
};
```

---

## 四、開發優先級與階段

### Phase 1：基礎改版（MVP）- 預計 2-3 小時
- ✅ 統一分類篩選（移除重複的 Tabs）
- ✅ 卡片類型改為建議類型（移除 rule/issue/work_package）
- ✅ 升級 AI 輸入區（引導文案 + Prompt Chips）
- ✅ 卡片顯示摘要、負責人、期限、Citation 節錄
- ✅ 「為何這樣判斷？」展開說明

### Phase 2：批次處理 - 預計 1-2 小時
- ✅ 多選 Checkbox
- ✅ 批次工具列
- ✅ 批次確認/拒絕功能

### Phase 3：右側抽屜 - 預計 1-2 小時
- ✅ Sheet 組件整合
- ✅ ArtifactView 改為 Drawer 呈現
- ✅ 同來源衍生卡片列表

### Phase 4：優化細節（選配）- 預計 1 小時
- 響應式設計調整（手機版 Bottom Sheet）
- 來源分組顯示
- 快速編輯功能增強

---

## 五、驗收標準（Acceptance Criteria）

### AC1：分類統一
- [ ] 頁面只有一套分類篩選 UI（Badge Pills）
- [ ] 分類固定為：全部 / 待辦 / 待回覆 / 決議 / 變更
- [ ] 每個分類顯示正確的卡片數量

### AC2：建議類型明確
- [ ] 卡片左上 Select 只有 4 個選項（Action/Pending/Decision/CR）
- [ ] 用戶可修改類型，Confirm 時以選定類型入庫
- [ ] 移除 rule/issue/work_package 類型

### AC3：AI 秘書感強化
- [ ] AI 輸入區有明確的秘書式引導文案
- [ ] 顯示 5 個 Prompt Chips（可點擊觸發預設輸入）
- [ ] 處理中顯示「AI 正在分析...」
- [ ] 完成後顯示「已產生 N 張建議卡」

### AC4：卡片資訊完整
- [ ] 卡片顯示摘要（meta.summary）
- [ ] 卡片顯示建議負責人（assignee）
- [ ] 卡片顯示建議期限（due_date）
- [ ] 卡片顯示 Citation 節錄（meta.citations[0].text）
- [ ] 「為何這樣判斷？」可展開顯示 reasoning

### AC5：批次處理
- [ ] 卡片可多選（Checkbox）
- [ ] 選取後顯示批次工具列
- [ ] 批次確認/拒絕功能正常運作
- [ ] 批次操作後顯示 Toast 反饋

### AC6：右側抽屜
- [ ] 點擊「查看完整來源」從右側滑入抽屜
- [ ] 抽屜顯示原始內容全文
- [ ] 抽屜顯示 AI 引用片段高亮
- [ ] 抽屜顯示同來源衍生的其他建議卡
- [ ] 主區域卡片列表可繼續操作

---

## 六、技術實作細節

### 6.1 組件架構
```
InboxPage (頁面主組件)
├─ AI Input Section (Card)
│  ├─ Prompt Chips
│  ├─ ChatInput (已有 @ 提及功能)
│  └─ Processing Status
├─ Filter Section (Badge Pills)
├─ Batch Toolbar (條件顯示)
├─ Suggestion Cards List
│  └─ SuggestionCardV2 (升級版卡片)
│     ├─ Checkbox (多選)
│     ├─ Type Select
│     ├─ Summary Display
│     ├─ Assignee / Due Date
│     ├─ Citation Excerpt
│     ├─ Reasoning Toggle
│     └─ Actions (Reject/Edit/Confirm)
└─ Source Drawer (Sheet)
   └─ ArtifactViewDrawer
      ├─ Original Content
      ├─ Citations Highlight
      └─ Related Items
```

### 6.2 State 管理
```typescript
// InboxPage 新增狀態
const [selectedIds, setSelectedIds] = useState<string[]>([]); // 多選
const [drawerOpen, setDrawerOpen] = useState(false); // 抽屜
const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
const [promptChipValue, setPromptChipValue] = useState<string>(''); // Prompt Chip
```

### 6.3 批次操作實作
```typescript
const handleBatchConfirm = async () => {
  const storage = getStorageClient();
  const selectedItems = items.filter(i => selectedIds.includes(i.id));
  
  // 批次更新
  const results = await Promise.all(
    selectedItems.map(item => 
      storage.updateItem(item.id, { 
        status: getTargetStatus(item.type),
        type: item.type 
      })
    )
  );
  
  const successCount = results.filter(r => !r.error).length;
  toast.success(`已確認 ${successCount} 張建議卡入庫`);
  
  setSelectedIds([]);
  loadItems();
};

const handleBatchReject = async () => {
  // 顯示確認對話框
  if (!confirm(`確定要拒絕 ${selectedIds.length} 張建議卡？`)) return;
  
  const storage = getStorageClient();
  const results = await Promise.all(
    selectedIds.map(id => storage.deleteItem(id))
  );
  
  const successCount = results.filter(r => !r.error).length;
  toast.success(`已拒絕 ${successCount} 張建議卡`);
  
  setSelectedIds([]);
  loadItems();
};
```

---

## 七、注意事項

1. **遵守 Guidelines.md**：
   - 使用 `theme.css` 設計變數
   - 全中文介面（label 包裹文字）
   - 不寫死假資料（從 Adapter 讀取）

2. **保持向後相容**：
   - 現有 Item 資料結構可選擴展（meta 欄位）
   - 未填寫 meta.summary 時優雅降級（顯示 description）

3. **響應式設計**：
   - Prompt Chips 在小螢幕下可捲動
   - 右側抽屜在手機版改為 Bottom Sheet

4. **效能考量**：
   - 批次操作使用 Promise.all 並行處理
   - 卡片列表虛擬化（若超過 50 張）

5. **無障礙**：
   - Checkbox 有 aria-label
   - 批次工具列有鍵盤快捷鍵提示

---

## 八、Mock 資料準備

為了測試新功能，需要在 `LocalAdapter.initializeMockData()` 中添加包含完整 meta 欄位的建議卡範例：

```typescript
// 範例：完整 meta 的建議卡
{
  id: 'suggestion_001',
  project_id: 'proj_nmth_001',
  type: 'action',
  status: 'suggestion',
  title: '開通客戶測試環境權限',
  description: '客戶需要在本週五前進入測試環境驗收新功能，請工程師協助開通存取權限。',
  assignee: 'engineer@example.com',
  due_date: '2025-01-17',
  priority: 'high',
  source_artifact_id: 'artifact_meeting_001',
  meta: {
    confidence: 0.85,
    summary: 'AI 判斷：客戶要求開通測試環境存取權限，需在週五前完成',
    reasoning: '從會議記錄中偵測到「麻煩開權限」、「測試環境」、「本週五」等關鍵字，且語氣帶有請求性質，判斷這是一個需要工程師執行的高優先待辦任務。',
    citations: [
      {
        text: '客戶代表：麻煩幫我們開通測試環境的權限，這週五要驗收新功能，我們的 QA 需要先測試一輪。',
        source_name: '2025-01-10 專案週會記錄'
      }
    ]
  },
  created_at: new Date().toISOString()
}
```

---

## 九、預期成果

改版完成後，使用者進入收件匣將體驗到：

1. **清晰明確**：一套分類、建議類型標示清楚
2. **AI 秘書感**：引導文案 + Prompt Chips + 處理狀態反饋
3. **資訊充足**：摘要、負責人、期限、Citation 一目了然
4. **高效處理**：批次操作節省時間
5. **便捷查證**：右側抽屜查看來源不跳頁

整體體驗從「表單填寫」升級為「與 AI 秘書協作的工作台」。
