import React from 'react';
import { WorkPackage } from '../../lib/storage/types';
import { Package } from 'lucide-react';

interface WorkPackageSelectorProps {
  workPackages: WorkPackage[];
  value: string | null | undefined;
  onChange: (workPackageId: string | null) => void;
  disabled?: boolean;
}

export function WorkPackageSelector({
  workPackages,
  value,
  onChange,
  disabled = false
}: WorkPackageSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-muted-foreground">
        <Package className="h-4 w-4" />
        專案工作
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">未分類</option>
        {workPackages.map((wp) => (
          <option key={wp.id} value={wp.id}>
            {wp.title}
          </option>
        ))}
      </select>
    </div>
  );
}
