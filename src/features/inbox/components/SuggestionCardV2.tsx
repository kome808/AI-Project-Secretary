import React, { useState } from 'react';
import { CheckCircle2, XCircle, Edit2, FileText, AlertCircle, User, Calendar, TrendingUp, MessageSquare, ChevronDown, ChevronUp, Layers, Briefcase } from 'lucide-react';
import { Item, ItemType } from '../../../lib/storage/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SuggestionCardV2Props {
  item: Item;
  isSelected: boolean;
  onToggleSelect: (itemId: string) => void;
  onConfirm: (item: Item) => void;
  onReject: (itemId: string) => void;
  onEdit: (item: Item) => void;
  onViewSource: (artifactId: string) => void;
}

const SUGGESTION_TYPES: Record<ItemType, string> = {
  action: '待辦',
  pending: '待回覆',
  decision: '決議',
  cr: '變更',
  // 移除這些類型
  rule: '規則',
  issue: '問題',
  work_package: '專案工作'
};

const TYPE_COLORS: Record<ItemType, string> = {
  action: 'bg-blue-500 text-white border-blue-500',
  pending: 'bg-amber-500 text-white border-amber-500',
  decision: 'bg-emerald-500 text-white border-emerald-500',
  cr: 'bg-orange-500 text-white border-orange-500',
  rule: 'bg-purple-500 text-white border-purple-500',
  issue: 'bg-red-500 text-white border-red-500',
  work_package: 'bg-indigo-500 text-white border-indigo-500'
};

// 只保留四個核心類型用於選擇
const SELECTABLE_TYPES: ItemType[] = ['action', 'pending', 'decision', 'cr'];

export function SuggestionCardV2({
  item,
  isSelected,
  onToggleSelect,
  onConfirm,
  onReject,
  onEdit,
  onViewSource
}: SuggestionCardV2Props) {
  const [selectedType, setSelectedType] = useState<ItemType>(item.type);
  const [showReasoning, setShowReasoning] = useState(false);

  const handleConfirm = () => {
    const updatedItem = selectedType !== item.type
      ? { ...item, type: selectedType }
      : item;
    onConfirm(updatedItem);
  };

  const confidence = item.meta?.confidence || 0;
  const showConfidenceWarning = confidence < 0.7;
  const riskLevel = item.meta?.risk_level;
  const summary = item.meta?.summary;
  const reasoning = item.meta?.reasoning;
  const citations = item.meta?.citations || [];

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div
      className={`bg-card border-2 rounded-[var(--radius-lg)] transition-all hover:shadow-[var(--elevation-md)] ${isSelected ? 'border-primary' : 'border-border hover:border-accent/50'
        }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3 border-b border-border">
        {/* 多選 Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(item.id)}
          className="mt-1"
          aria-label="選取此建議卡"
        />

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* 明確標示「建議類型」*/}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">建議類型：</label>
            <Select
              value={SELECTABLE_TYPES.includes(selectedType) ? selectedType : 'action'}
              onValueChange={(value) => setSelectedType(value as ItemType)}
            >
              <SelectTrigger className={`w-auto h-7 gap-2 font-medium ${TYPE_COLORS[selectedType]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SELECTABLE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {SUGGESTION_TYPES[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 風險 Badge for CR */}
          {selectedType === 'cr' && riskLevel && (
            <Badge
              variant="outline"
              className={`${riskLevel === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                  riskLevel === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                }`}
            >
              <label>{riskLevel === 'high' ? '高風險' : riskLevel === 'medium' ? '中風險' : '低風險'}</label>
            </Badge>
          )}

          {/* Confidence Warning */}
          {showConfidenceWarning && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1">
              <AlertCircle className="h-3 w-3" />
              <label>低信心度</label>
            </Badge>
          )}
        </div>

        {/* Confidence Score */}
        {confidence > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground shrink-0">
            <TrendingUp className="h-4 w-4" />
            <label className="text-xs">{Math.round(confidence * 100)}%</label>
          </div>
        )}
      </div>

      {/* Body - 核心資訊 */}
      <div className="p-4 space-y-3">
        {/* 標題與分類標籤 */}
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="line-clamp-2">{item.title}</h3>
          {/* 功能模組標識 */}
          {item.meta?.isFeatureModule && (
            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 gap-1 shrink-0">
              <Layers className="h-3 w-3" />
              <label>功能模組</label>
            </Badge>
          )}
          {/* 專案工作標識 */}
          {item.meta?.isWorkPackage && (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 shrink-0">
              <Briefcase className="h-3 w-3" />
              <label>專案工作</label>
            </Badge>
          )}
          {/* AI 來源標識 */}
          {item.meta?.ai_source && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 shrink-0 text-xs">
              AI 分析
            </Badge>
          )}
        </div>

        {/* AI 摘要（必顯示，一句話結論）*/}
        <div className="flex items-start gap-2">
          <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <p className="text-sm">
            <label className="font-medium text-foreground">摘要：</label>
            <label className="text-muted-foreground">
              {summary || item.description || '（AI 未提供摘要）'}
            </label>
          </p>
        </div>

        {/* 來源節錄（必顯示）*/}
        {citations.length > 0 && citations[0].text ? (
          <div className="p-3 rounded-[var(--radius)] bg-muted/30 border-l-2 border-accent">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <label className="text-xs font-medium text-muted-foreground">來源：</label>
              {citations[0].source_name && (
                <label className="text-xs text-muted-foreground">{citations[0].source_name}</label>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              <label>「{citations[0].text}」</label>
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-[var(--radius)] bg-muted/20 border border-dashed border-muted">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
              <label className="text-xs text-muted-foreground opacity-50">來源：無引用節錄</label>
            </div>
          </div>
        )}

        {/* 建議負責人與期限 */}
        <div className="flex flex-wrap gap-3 pt-1">
          {item.assignee_id ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-4 w-4" />
              <label className="text-sm">{item.assignee_id}</label>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground opacity-50">
              <User className="h-4 w-4" />
              <label className="text-sm">未指定負責人</label>
            </div>
          )}

          {item.due_date ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <label className="text-sm">{formatDate(item.due_date)}</label>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground opacity-50">
              <Calendar className="h-4 w-4" />
              <label className="text-sm">未設定期限</label>
            </div>
          )}
        </div>

        {/* 為何這樣判斷？ */}
        {reasoning && (
          <div className="space-y-2">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-1 text-sm text-primary hover:underline transition-colors"
            >
              <label className="cursor-pointer">
                {showReasoning ? '收起說明' : '為何這樣判斷？'}
              </label>
              {showReasoning ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showReasoning && (
              <p className="text-sm text-muted-foreground pl-4 border-l-2 border-muted">
                <label>{reasoning}</label>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-b-[var(--radius-lg)] border-t border-border">
        {/* Citation / View Source */}
        {item.source_artifact_id ? (
          <button
            onClick={() => onViewSource(item.source_artifact_id!)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors group"
          >
            <FileText className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <label className="cursor-pointer text-sm">查看完整來源</label>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground opacity-50">
            <FileText className="h-4 w-4" />
            <label className="text-sm">無來源</label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReject(item.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <XCircle className="h-4 w-4 mr-1" />
            <label>拒絕</label>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            className="hover:bg-muted"
          >
            <Edit2 className="h-4 w-4 mr-1" />
            <label>編輯</label>
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            <label>確認入庫</label>
          </Button>
        </div>
      </div>
    </div>
  );
}