import React, { useEffect, useState } from 'react';
import { Gavel, Plus } from 'lucide-react';
import { Item, DecisionMeta } from '../../lib/storage/types';
import { getStorageClient } from '../../lib/storage';
import { useProject } from '../context/ProjectContext';
import { DecisionsList } from './DecisionsList';
import { DecisionFilters } from './DecisionFilters';
import { DecisionDetail } from './DecisionDetail';
import { Button } from '@/components/ui/button';
import { CreateDecisionDialog } from './CreateDecisionDialog';

export function DecisionsPage() {
  const { currentProject } = useProject();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['active']);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadItems();
    }
  }, [currentProject]);

  const loadItems = async () => {
    if (!currentProject) return;

    setLoading(true);
    const storage = getStorageClient();
    
    // Fetch both decisions and rules
    const [decisionsRes, rulesRes] = await Promise.all([
      storage.getItems(currentProject.id, { type: 'decision' }),
      storage.getItems(currentProject.id, { type: 'rule' })
    ]);

    const allItems: Item[] = [];
    if (decisionsRes.data) allItems.push(...decisionsRes.data);
    if (rulesRes.data) allItems.push(...rulesRes.data);

    // Filter out suggestions (inbox items)
    const confirmedItems = allItems.filter(item => item.status !== 'suggestion');
    setItems(confirmedItems);
    setLoading(false);
  };

  const filteredItems = items.filter(item => {
    const meta = item.meta as DecisionMeta || {};
    
    // Search filter
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Type filter
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(item.type);
    
    // Category filter
    const itemCategory = meta.category || 'other';
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(itemCategory);
    
    // Scope filter
    const itemScope = meta.scope || 'global';
    const matchesScope = selectedScopes.length === 0 || selectedScopes.includes(itemScope);
    
    // Status filter
    const itemStatus = meta.status || 'active';
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(itemStatus);
    
    return matchesSearch && matchesType && matchesCategory && matchesScope && matchesStatus;
  });

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleScopeToggle = (scope: string) => {
    setSelectedScopes(prev => 
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground font-medium">請先選擇專案</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm">
            <Gavel className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="tracking-tight text-3xl font-bold mb-1">決議記錄 & 規則</h1>
            <p className="text-muted-foreground max-w-lg">
              管理專案的單一事實來源 (SSOT)，包含所有已定案的決議與規則。每一筆記錄都具備強 Citation 溯源能力。
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 h-11 px-6 shadow-md hover:shadow-lg transition-all active:scale-95">
          <Plus className="h-5 w-5" />
          新增紀錄
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm mb-8">
        {/* Filters */}
        <DecisionFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTypes={selectedTypes}
          onTypeToggle={handleTypeToggle}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
          selectedScopes={selectedScopes}
          onScopeToggle={handleScopeToggle}
          selectedStatuses={selectedStatuses}
          onStatusToggle={handleStatusToggle}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <DecisionsList 
          items={filteredItems} 
          onItemClick={setSelectedItem} 
        />
      )}

      {/* Detail Sheet */}
      <DecisionDetail 
        decision={selectedItem} 
        onClose={() => setSelectedItem(null)} 
        onUpdate={loadItems}
      />

      {/* Create Dialog */}
      <CreateDecisionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={loadItems}
      />
    </div>
  );
}