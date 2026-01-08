import { Item } from '../../../lib/storage/types';
import { SuggestionCardV2 } from './SuggestionCardV2';
import { Inbox } from 'lucide-react';

interface InboxListProps {
  items: Item[];
  projectItems: Item[]; // All project items for tree selector
  selectedIds: string[];
  onToggleSelect: (itemId: string) => void;
  onConfirm: (item: Item) => void;
  onReject: (itemId: string) => void;
  onEdit: (item: Item) => void;
  onViewSource: (artifactId: string) => void;
}

export function InboxList({
  items,
  projectItems,
  selectedIds,
  onToggleSelect,
  onConfirm,
  onReject,
  onEdit,
  onViewSource
}: InboxListProps) {

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-16 w-16 text-muted-foreground opacity-30 mb-4" />
        <h3 className="mb-2"><label>收件匣是空的</label></h3>
        <p className="text-muted-foreground max-w-md">
          <label>在上方輸入內容或上傳檔案，AI 會自動產生建議卡</label>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cards List */}
      <div className="space-y-3">
        {items.map(item => (
          <SuggestionCardV2
            key={item.id}
            item={item}
            projectItems={projectItems}
            isSelected={selectedIds.includes(item.id)}
            onToggleSelect={onToggleSelect}
            onConfirm={onConfirm}
            onReject={onReject}
            onEdit={onEdit}
            onViewSource={onViewSource}
          />
        ))}
      </div>
    </div>
  );
}