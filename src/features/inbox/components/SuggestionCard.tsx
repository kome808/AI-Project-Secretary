import React, { useState } from 'react';
import { CheckCircle2, XCircle, Edit2, FileText, AlertCircle, User, Calendar, TrendingUp } from 'lucide-react';
import { Item, ItemType } from '../../../lib/storage/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArtifactView } from './ArtifactView';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SuggestionCardProps {
  item: Item;
  onConfirm: (item: Item) => void;
  onReject: (itemId: string) => void;
  onEdit: (item: Item) => void;
}

const TYPE_LABELS: Record<ItemType, string> = {
  action: '待辦',
  pending: '待回覆',
  decision: '決議',
  rule: '規則',
  issue: '問題',
  cr: '需求變更',
  work_package: '專案工作'
};

const TYPE_COLORS: Record<ItemType, string> = {
  action: 'bg-blue-500 text-white border-blue-500',
  pending: 'bg-amber-500 text-white border-amber-500',
  decision: 'bg-emerald-500 text-white border-emerald-500',
  rule: 'bg-purple-500 text-white border-purple-500',
  issue: 'bg-red-500 text-white border-red-500',
  cr: 'bg-orange-500 text-white border-orange-500',
  work_package: 'bg-indigo-500 text-white border-indigo-500'
};

export function SuggestionCard({ item, onConfirm, onReject, onEdit }: SuggestionCardProps) {
  const [selectedType, setSelectedType] = useState<ItemType>(item.type);
  const [showArtifact, setShowArtifact] = useState(false);

  const handleConfirm = () => {
    const updatedItem = selectedType !== item.type 
      ? { ...item, type: selectedType }
      : item;
    onConfirm(updatedItem);
  };

  const confidence = item.meta?.confidence || 0;
  const showConfidenceWarning = confidence < 0.7;
  const riskLevel = item.meta?.risk_level;

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
    <>
      <div className="bg-card border-2 border-border rounded-[var(--radius-lg)] hover:border-accent/50 transition-all hover:shadow-[var(--elevation-md)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ItemType)}>
              <SelectTrigger className={`w-auto h-8 gap-2 font-medium ${TYPE_COLORS[selectedType]}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Risk Badge for CR */}
            {selectedType === 'cr' && riskLevel && (
              <Badge 
                variant="outline" 
                className={`${
                  riskLevel === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                  riskLevel === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {riskLevel === 'high' ? '高風險' : riskLevel === 'medium' ? '中風險' : '低風險'}
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

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="space-y-2">
            <h3 className="line-clamp-2">{item.title}</h3>
            <p className="text-muted-foreground line-clamp-3">{item.description}</p>
          </div>

          {/* Metadata */}
          {(item.assignee || item.due_date || item.priority) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {item.assignee && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <label>{item.assignee}</label>
                </div>
              )}
              {item.due_date && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <label>{formatDate(item.due_date)}</label>
                </div>
              )}
              {item.priority && item.priority !== 'medium' && (
                <Badge 
                  variant="outline" 
                  className={
                    item.priority === 'high' 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }
                >
                  {item.priority === 'high' ? '高優先' : '低優先'}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-b-[var(--radius-lg)] border-t border-border">
          {/* Citation */}
          {item.source_artifact_id ? (
            <button
              onClick={() => setShowArtifact(true)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors group"
            >
              <FileText className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <label className="cursor-pointer">查看來源</label>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground opacity-50">
              <FileText className="h-4 w-4" />
              <label>無來源</label>
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

      {/* Artifact Dialog */}
      {item.source_artifact_id && (
        <ArtifactView
          artifactId={item.source_artifact_id}
          open={showArtifact}
          onOpenChange={setShowArtifact}
        />
      )}
    </>
  );
}
