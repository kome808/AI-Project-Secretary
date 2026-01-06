import React, { useEffect, useState } from 'react';
import { GitPullRequest, Search, Filter, Loader2, Plus } from 'lucide-react';
import { Item, Member } from '../../lib/storage';
import { useProject } from '../context/ProjectContext';
import { CRList } from './CRList';
import { CRDetail } from './CRDetail';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function CRPage() {
  const { currentProject, adapter } = useProject();
  const [items, setItems] = useState<Item[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    loadItems();
    loadMembers();
  }, [currentProject]);

  const loadItems = async () => {
    if (!currentProject) return;
    setLoading(true);
    const { data } = await adapter.getItems(currentProject.id, { type: 'cr' });
    // 過濾掉建議卡（status = 'suggestion'），只顯示已確認入庫的變更需求
    const confirmedItems = (data || []).filter(item => item.status !== 'suggestion');
    setItems(confirmedItems);
    setLoading(false);
  };

  const loadMembers = async () => {
    if (!currentProject) return;
    const { data } = await adapter.getMembers(currentProject.id);
    if (data) setMembers(data);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">請先選擇專案</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <GitPullRequest className="h-6 w-6" />
          </div>
          <div>
            <h1>需求變更 (CR)</h1>
            <p className="text-muted-foreground">追蹤規格基準點後的變更建議與決策</p>
          </div>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          手動新增 CR
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between">
          <Input
            placeholder="搜尋 CR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          <Filter className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CRList items={filteredItems} members={members} onItemClick={setSelectedItem} />
      )}

      {selectedItem && (
        <CRDetail 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          onUpdate={loadItems}
        />
      )}
    </div>
  );
}