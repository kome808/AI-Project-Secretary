import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { ChevronDown, Plus, Folder } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from './CreateProjectDialog';

export function ProjectSwitcher() {
  const { projects, currentProject, selectProject } = useProject();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // If no projects, show placeholder
  if (projects.length === 0) {
    return (
      <>
        <Button variant="outline" className="w-full justify-between" onClick={() => setIsCreateOpen(true)}>
          <span>建立專案</span>
          <Plus className="h-4 w-4" />
        </Button>
        <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between px-3 h-12 border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Folder className="h-4 w-4" />
              </div>
              <span className="truncate font-medium">
                {currentProject?.name || "選擇專案"}
              </span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>專案列表</DropdownMenuLabel>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => selectProject(project.id)}
              className="flex items-center gap-2 cursor-pointer"
            >
               <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background">
                  <span className="text-xs font-medium">{project.name.substring(0, 1).toUpperCase()}</span>
               </div>
               <span className={currentProject?.id === project.id ? "font-bold" : ""}>
                 {project.name}
               </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="cursor-pointer text-muted-foreground"
            onSelect={(e) => {
              e.preventDefault(); // Prevent closing dropdown immediately if needed, but Dialog handles it
              setIsCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>建立專案</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </>
  );
}