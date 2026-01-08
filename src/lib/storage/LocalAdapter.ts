import {
  StorageAdapter,
  StorageResponse,
  Project,
  ProjectStatus,
  Member,
  Artifact,
  Item,
  ItemStatus,
  ItemType,
  GlobalConfig,
  ProjectConfig,
  ConnectionStatus,
  Module,
  Page,
  Milestone,
  WorkPackage,
  WorkActivity,
  SystemAIConfig,
  AIProvider,
  SystemPromptConfig
} from './types';
import { WBS_PARSER_PROMPT, generateSystemPrompt, generateFewShotPrompt, DEFAULT_PROMPT_TEMPLATES } from '../ai/prompts';

const STORAGE_KEYS = {
  PROJECTS: 'proto_projects',
  MEMBERS: 'proto_members',
  ARTIFACTS: 'proto_artifacts',
  ITEMS: 'proto_items',
  GLOBAL_CONFIG: 'proto_global_config',
  PROJECT_CONFIGS: 'proto_project_configs',
  MODULES: 'proto_modules',
  PAGES: 'proto_pages',
  MILESTONES: 'proto_milestones',
  WORK_PACKAGES: 'proto_work_packages',
  WORK_ACTIVITIES: 'proto_work_activities',
  SYSTEM_PROMPTS: 'proto_system_prompts'
};

export class LocalAdapter implements StorageAdapter {
  private read<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error reading from local storage key ${key}:`, e);
      return null;
    }
  }

  private write<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving to local storage key ${key}:`, e);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Simulate network delay
  private async simulateDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 300));
  }

  async getProjects(): Promise<StorageResponse<Project[]>> {
    await this.simulateDelay();
    try {
      const projects = this.read<Project[]>(STORAGE_KEYS.PROJECTS) || [];
      // Sort by created_at desc (do NOT filter here - let callers decide)
      projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { data: projects, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async createProject(projectData: Omit<Project, 'id' | 'created_at'>): Promise<StorageResponse<Project>> {
    await this.simulateDelay();
    try {
      const projects = this.read<Project[]>(STORAGE_KEYS.PROJECTS) || [];

      const newProject: Project = {
        id: this.generateId(),
        created_at: new Date().toISOString(),
        ...projectData
      };

      projects.push(newProject);
      this.write(STORAGE_KEYS.PROJECTS, projects);

      return { data: newProject, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async getProjectById(id: string): Promise<StorageResponse<Project>> {
    await this.simulateDelay();
    try {
      const projects = this.read<Project[]>(STORAGE_KEYS.PROJECTS) || [];
      const project = projects.find(p => p.id === id);

      if (!project) {
        return { data: null, error: new Error('Project not found') };
      }

      return { data: project, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>): Promise<StorageResponse<Project>> {
    await this.simulateDelay();
    try {
      const projects = this.read<Project[]>(STORAGE_KEYS.PROJECTS) || [];
      const index = projects.findIndex(p => p.id === id);

      if (index === -1) {
        return { data: null, error: new Error('Project not found') };
      }

      const updatedProject: Project = {
        ...projects[index],
        ...updates,
        updated_at: new Date().toISOString()
      };

      projects[index] = updatedProject;
      this.write(STORAGE_KEYS.PROJECTS, projects);

      return { data: updatedProject, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateProjectStatus(id: string, status: ProjectStatus): Promise<StorageResponse<Project>> {
    return this.updateProject(id, { status });
  }

  async softDeleteProject(id: string): Promise<StorageResponse<Project>> {
    await this.simulateDelay();
    try {
      const projects = this.read<Project[]>(STORAGE_KEYS.PROJECTS) || [];
      const index = projects.findIndex(p => p.id === id);

      if (index === -1) {
        return { data: null, error: new Error('Project not found') };
      }

      const now = new Date();
      const purgeDate = new Date(now);
      purgeDate.setDate(purgeDate.getDate() + 30); // 30 days from now

      const updatedProject: Project = {
        ...projects[index],
        status: 'pending_deletion',
        deleted_at: now.toISOString(),
        purge_at: purgeDate.toISOString(),
        updated_at: now.toISOString()
      };

      projects[index] = updatedProject;
      this.write(STORAGE_KEYS.PROJECTS, projects);

      return { data: updatedProject, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async restoreProject(id: string): Promise<StorageResponse<Project>> {
    await this.simulateDelay();
    try {
      const projects = this.read<Project[]>(STORAGE_KEYS.PROJECTS) || [];
      const index = projects.findIndex(p => p.id === id);

      if (index === -1) {
        return { data: null, error: new Error('Project not found') };
      }

      if (projects[index].status !== 'pending_deletion') {
        return { data: null, error: new Error('Project is not pending deletion') };
      }

      const updatedProject: Project = {
        ...projects[index],
        status: 'active',
        deleted_at: undefined,
        purge_at: undefined,
        updated_at: new Date().toISOString()
      };

      projects[index] = updatedProject;
      this.write(STORAGE_KEYS.PROJECTS, projects);

      return { data: updatedProject, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }



  async purgeProject(id: string): Promise<StorageResponse<void>> {
    await this.simulateDelay();
    try {
      // Remove project
      let projects = this.read<Project[]>(STORAGE_KEYS.PROJECTS) || [];
      const projectExists = projects.some(p => p.id === id);

      if (!projectExists) {
        return { data: null, error: new Error('Project not found') };
      }

      projects = projects.filter(p => p.id !== id);
      this.write(STORAGE_KEYS.PROJECTS, projects);

      // Remove related data (cascade delete)
      // Members
      let members = this.read<Member[]>(STORAGE_KEYS.MEMBERS) || [];
      members = members.filter(m => m.project_id !== id);
      this.write(STORAGE_KEYS.MEMBERS, members);

      // Artifacts
      let artifacts = this.read<Artifact[]>(STORAGE_KEYS.ARTIFACTS) || [];
      artifacts = artifacts.filter(a => a.project_id !== id);
      this.write(STORAGE_KEYS.ARTIFACTS, artifacts);

      // Items
      let items = this.read<Item[]>(STORAGE_KEYS.ITEMS) || [];
      items = items.filter(i => i.project_id !== id);
      this.write(STORAGE_KEYS.ITEMS, items);

      // Modules
      let modules = this.read<Module[]>(STORAGE_KEYS.MODULES) || [];
      modules = modules.filter(m => m.project_id !== id);
      this.write(STORAGE_KEYS.MODULES, modules);

      // Pages
      let pages = this.read<Page[]>(STORAGE_KEYS.PAGES) || [];
      pages = pages.filter(p => p.project_id !== id);
      this.write(STORAGE_KEYS.PAGES, pages);

      // Milestones
      let milestones = this.read<Milestone[]>(STORAGE_KEYS.MILESTONES) || [];
      milestones = milestones.filter(m => m.project_id !== id);
      this.write(STORAGE_KEYS.MILESTONES, milestones);

      // Work Packages
      let workPackages = this.read<WorkPackage[]>(STORAGE_KEYS.WORK_PACKAGES) || [];
      workPackages = workPackages.filter(w => w.project_id !== id);
      this.write(STORAGE_KEYS.WORK_PACKAGES, workPackages);

      // Work Activities
      let workActivities = this.read<WorkActivity[]>(STORAGE_KEYS.WORK_ACTIVITIES) || [];
      workActivities = workActivities.filter(w => w.project_id !== id);
      this.write(STORAGE_KEYS.WORK_ACTIVITIES, workActivities);

      // Project Config
      const configs = this.read<Record<string, ProjectConfig>>(STORAGE_KEYS.PROJECT_CONFIGS) || {};
      delete configs[id];
      this.write(STORAGE_KEYS.PROJECT_CONFIGS, configs);

      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async getMembers(projectId: string): Promise<StorageResponse<Member[]>> {
    await this.simulateDelay();
    try {
      const members = this.read<Member[]>(STORAGE_KEYS.MEMBERS) || [];
      const projectMembers = members.filter(m => m.project_id === projectId);
      return { data: projectMembers, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async addMember(memberData: Omit<Member, 'id' | 'joined_at'>): Promise<StorageResponse<Member>> {
    await this.simulateDelay();
    try {
      const members = this.read<Member[]>(STORAGE_KEYS.MEMBERS) || [];

      const newMember: Member = {
        id: this.generateId(),
        joined_at: new Date().toISOString(),
        ...memberData
      };

      members.push(newMember);
      this.write(STORAGE_KEYS.MEMBERS, members);

      return { data: newMember, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateMember(id: string, updates: Partial<Omit<Member, 'id' | 'project_id' | 'joined_at'>>): Promise<StorageResponse<Member>> {
    await this.simulateDelay();
    try {
      const members = this.read<Member[]>(STORAGE_KEYS.MEMBERS) || [];
      const index = members.findIndex(m => m.id === id);

      if (index === -1) {
        return { data: null, error: new Error('Member not found') };
      }

      const updatedMember: Member = {
        ...members[index],
        ...updates
      };

      members[index] = updatedMember;
      this.write(STORAGE_KEYS.MEMBERS, members);


      return { data: updatedMember, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async deleteMember(id: string): Promise<StorageResponse<void>> {
    await this.simulateDelay();
    try {
      const members = this.read<Member[]>(STORAGE_KEYS.MEMBERS) || [];
      const filtered = members.filter(m => m.id !== id);
      this.write(STORAGE_KEYS.MEMBERS, filtered);
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  // Artifact Methods
  async createArtifact(artifactData: Omit<Artifact, 'id' | 'created_at'>): Promise<StorageResponse<Artifact>> {
    await this.simulateDelay();
    try {
      const artifacts = this.read<Artifact[]>(STORAGE_KEYS.ARTIFACTS) || [];

      const newArtifact: Artifact = {
        id: this.generateId(),
        created_at: new Date().toISOString(),
        ...artifactData
      };

      artifacts.push(newArtifact);
      this.write(STORAGE_KEYS.ARTIFACTS, artifacts);

      return { data: newArtifact, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateArtifact(id: string, updates: Partial<Omit<Artifact, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Artifact>> {
    await this.simulateDelay();
    try {
      const artifacts = this.read<Artifact[]>(STORAGE_KEYS.ARTIFACTS) || [];
      const index = artifacts.findIndex(a => a.id === id);

      if (index === -1) {
        return { data: null, error: new Error('Artifact not found') };
      }

      const updatedArtifact: Artifact = {
        ...artifacts[index],
        ...updates
      };

      artifacts[index] = updatedArtifact;
      this.write(STORAGE_KEYS.ARTIFACTS, artifacts);

      return { data: updatedArtifact, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async deleteArtifact(id: string): Promise<StorageResponse<void>> {
    await this.simulateDelay(); // 模擬網路延遲
    try {
      let artifacts = this.read<Artifact[]>(STORAGE_KEYS.ARTIFACTS) || [];
      const initialLength = artifacts.length;
      artifacts = artifacts.filter(item => item.id !== id);

      if (artifacts.length === initialLength) {
        return { data: null, error: new Error('Artifact not found') };
      }

      this.write(STORAGE_KEYS.ARTIFACTS, artifacts);
      return { data: undefined, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async getArtifactById(id: string): Promise<StorageResponse<Artifact>> {
    await this.simulateDelay();
    try {
      const artifacts = this.read<Artifact[]>(STORAGE_KEYS.ARTIFACTS) || [];
      const artifact = artifacts.find(a => a.id === id);

      if (!artifact) {
        return { data: null, error: new Error('Artifact not found') };
      }

      return { data: artifact, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async getArtifacts(projectId: string): Promise<StorageResponse<Artifact[]>> {
    await this.simulateDelay();
    try {
      const artifacts = this.read<Artifact[]>(STORAGE_KEYS.ARTIFACTS) || [];
      const projectArtifacts = artifacts.filter(a => a.project_id === projectId);
      // Sort by created_at desc
      projectArtifacts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { data: projectArtifacts, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  // Item Methods
  async createItem(itemData: Omit<Item, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResponse<Item>> {
    await this.simulateDelay();
    try {
      const items = this.read<Item[]>(STORAGE_KEYS.ITEMS) || [];

      const now = new Date().toISOString();
      const newItem: Item = {
        id: this.generateId(),
        created_at: now,
        updated_at: now,
        ...itemData
      };

      items.push(newItem);
      this.write(STORAGE_KEYS.ITEMS, items);

      return { data: newItem, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateItem(id: string, updates: Partial<Omit<Item, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Item>> {
    await this.simulateDelay();
    try {
      const items = this.read<Item[]>(STORAGE_KEYS.ITEMS) || [];
      const index = items.findIndex(i => i.id === id);

      if (index === -1) {
        return { data: null, error: new Error('Item not found') };
      }

      const updatedItem: Item = {
        ...items[index],
        ...updates,
        updated_at: new Date().toISOString()
      };

      items[index] = updatedItem;
      this.write(STORAGE_KEYS.ITEMS, items);

      return { data: updatedItem, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async getItemById(id: string): Promise<StorageResponse<Item>> {
    await this.simulateDelay();
    try {
      const items = this.read<Item[]>(STORAGE_KEYS.ITEMS) || [];
      const item = items.find(i => i.id === id);

      if (!item) {
        return { data: null, error: new Error('Item not found') };
      }

      return { data: item, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async getItems(projectId: string, filters?: { status?: ItemStatus; type?: ItemType }): Promise<StorageResponse<Item[]>> {
    await this.simulateDelay();
    try {
      const items = this.read<Item[]>(STORAGE_KEYS.ITEMS) || [];
      let filtered = items.filter(i => i.project_id === projectId);

      if (filters?.status) {
        filtered = filtered.filter(i => i.status === filters.status);
      }

      if (filters?.type) {
        filtered = filtered.filter(i => i.type === filters.type);
      }

      // Sort by created_at desc
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { data: filtered, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async deleteItem(id: string): Promise<StorageResponse<void>> {
    try {
      const items = this.read<Item[]>(STORAGE_KEYS.ITEMS) || [];
      const filtered = items.filter(i => i.id !== id);
      this.write(STORAGE_KEYS.ITEMS, filtered);
      return { data: undefined, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  // Module 11 Methods
  async getModules(projectId: string): Promise<StorageResponse<Module[]>> {
    try {
      const all = this.read<Module[]>(STORAGE_KEYS.MODULES) || [];
      const filtered = all.filter(m => m.project_id === projectId);
      return { data: filtered, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async createModule(module: Omit<Module, 'id' | 'created_at'>): Promise<StorageResponse<Module>> {
    try {
      const all = this.read<Module[]>(STORAGE_KEYS.MODULES) || [];
      const newModule: Module = {
        ...module,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      all.push(newModule);
      this.write(STORAGE_KEYS.MODULES, all);
      return { data: newModule, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateModule(id: string, updates: Partial<Omit<Module, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Module>> {
    try {
      const all = this.read<Module[]>(STORAGE_KEYS.MODULES) || [];
      const index = all.findIndex(m => m.id === id);
      if (index === -1) throw new Error('Module not found');
      all[index] = { ...all[index], ...updates };
      this.write(STORAGE_KEYS.MODULES, all);
      return { data: all[index], error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async getPages(projectId: string, moduleId?: string): Promise<StorageResponse<Page[]>> {
    try {
      const all = this.read<Page[]>(STORAGE_KEYS.PAGES) || [];
      let filtered = all.filter(p => p.project_id === projectId);
      if (moduleId) {
        filtered = filtered.filter(p => p.module_id === moduleId);
      }
      return { data: filtered, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async createPage(page: Omit<Page, 'id' | 'created_at'>): Promise<StorageResponse<Page>> {
    try {
      const all = this.read<Page[]>(STORAGE_KEYS.PAGES) || [];
      const newPage: Page = {
        ...page,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      all.push(newPage);
      this.write(STORAGE_KEYS.PAGES, all);
      return { data: newPage, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updatePage(id: string, updates: Partial<Omit<Page, 'id' | 'module_id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Page>> {
    try {
      const all = this.read<Page[]>(STORAGE_KEYS.PAGES) || [];
      const index = all.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Page not found');
      all[index] = { ...all[index], ...updates };
      this.write(STORAGE_KEYS.PAGES, all);
      return { data: all[index], error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async getMilestones(projectId: string): Promise<StorageResponse<Milestone[]>> {
    try {
      const all = this.read<Milestone[]>(STORAGE_KEYS.MILESTONES) || [];
      const filtered = all.filter(m => m.project_id === projectId);
      return { data: filtered.sort((a, b) => a.start_date.localeCompare(b.start_date)), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async createMilestone(milestone: Omit<Milestone, 'id' | 'created_at'>): Promise<StorageResponse<Milestone>> {
    try {
      const all = this.read<Milestone[]>(STORAGE_KEYS.MILESTONES) || [];
      const newMilestone: Milestone = {
        ...milestone,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      all.push(newMilestone);
      this.write(STORAGE_KEYS.MILESTONES, all);
      return { data: newMilestone, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateMilestone(id: string, updates: Partial<Omit<Milestone, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<Milestone>> {
    try {
      const all = this.read<Milestone[]>(STORAGE_KEYS.MILESTONES) || [];
      const index = all.findIndex(m => m.id === id);
      if (index === -1) throw new Error('Milestone not found');
      all[index] = { ...all[index], ...updates };
      this.write(STORAGE_KEYS.MILESTONES, all);
      return { data: all[index], error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  // Work Package Methods
  // 🔥 DEPRECATED: 舊版 work_packages 表已棄用，改用 items 表中的 isWorkPackage 項目
  async getWorkPackages(projectId: string): Promise<StorageResponse<WorkPackage[]>> {
    await this.simulateDelay();
    // Return empty array to deprecate old table
    console.warn('[DEPRECATED] getWorkPackages: This method is deprecated. Use items with meta.isWorkPackage instead.');
    return { data: [], error: null };
  }

  async createWorkPackage(workPackage: Omit<WorkPackage, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResponse<WorkPackage>> {
    try {
      const all = this.read<WorkPackage[]>(STORAGE_KEYS.WORK_PACKAGES) || [];
      const newWorkPackage: WorkPackage = {
        ...workPackage,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      all.push(newWorkPackage);
      this.write(STORAGE_KEYS.WORK_PACKAGES, all);
      return { data: newWorkPackage, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateWorkPackage(id: string, updates: Partial<Omit<WorkPackage, 'id' | 'project_id' | 'created_at'>>): Promise<StorageResponse<WorkPackage>> {
    try {
      const all = this.read<WorkPackage[]>(STORAGE_KEYS.WORK_PACKAGES) || [];
      const index = all.findIndex(wp => wp.id === id);
      if (index === -1) throw new Error('Work Package not found');
      all[index] = {
        ...all[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.write(STORAGE_KEYS.WORK_PACKAGES, all);
      return { data: all[index], error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async deleteWorkPackage(id: string): Promise<StorageResponse<void>> {
    try {
      const all = this.read<WorkPackage[]>(STORAGE_KEYS.WORK_PACKAGES) || [];
      const filtered = all.filter(wp => wp.id !== id);
      this.write(STORAGE_KEYS.WORK_PACKAGES, filtered);
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  // Work Activity Methods
  async getWorkActivities(projectId: string, workPackageId?: string): Promise<StorageResponse<WorkActivity[]>> {
    await this.simulateDelay();
    try {
      const all = this.read<WorkActivity[]>(STORAGE_KEYS.WORK_ACTIVITIES) || [];
      let filtered = all.filter(wa => wa.project_id === projectId);
      if (workPackageId) {
        filtered = filtered.filter(wa => wa.work_package_id === workPackageId);
      }
      return { data: filtered, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async createWorkActivity(workActivity: Omit<WorkActivity, 'id' | 'created_at'>): Promise<StorageResponse<WorkActivity>> {
    try {
      const all = this.read<WorkActivity[]>(STORAGE_KEYS.WORK_ACTIVITIES) || [];
      const newActivity: WorkActivity = {
        ...workActivity,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      all.push(newActivity);
      this.write(STORAGE_KEYS.WORK_ACTIVITIES, all);
      return { data: newActivity, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateWorkActivity(id: string, updates: Partial<Omit<WorkActivity, 'id' | 'project_id' | 'work_package_id' | 'created_at'>>): Promise<StorageResponse<WorkActivity>> {
    try {
      const all = this.read<WorkActivity[]>(STORAGE_KEYS.WORK_ACTIVITIES) || [];
      const index = all.findIndex(wa => wa.id === id);
      if (index === -1) throw new Error('Work Activity not found');
      all[index] = { ...all[index], ...updates };
      this.write(STORAGE_KEYS.WORK_ACTIVITIES, all);
      return { data: all[index], error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async deleteWorkActivity(id: string): Promise<StorageResponse<void>> {
    try {
      const all = this.read<WorkActivity[]>(STORAGE_KEYS.WORK_ACTIVITIES) || [];
      const filtered = all.filter(wa => wa.id !== id);
      this.write(STORAGE_KEYS.WORK_ACTIVITIES, all);
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  // System Settings Methods
  async getGlobalConfig(): Promise<StorageResponse<GlobalConfig>> {
    await this.simulateDelay();
    try {
      const configs = this.read<GlobalConfig[]>(STORAGE_KEYS.GLOBAL_CONFIG) || [];
      if (configs.length > 0) {
        return { data: configs[0], error: null };
      }

      const defaultConfig: GlobalConfig = {
        chat_model: 'gpt-4o',
        embedding_model: 'text-embedding-3-small',
        updated_at: new Date().toISOString()
      };
      return { data: defaultConfig, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateGlobalConfig(updates: Partial<GlobalConfig>): Promise<StorageResponse<GlobalConfig>> {
    await this.simulateDelay();
    try {
      // SECURITY RULE: Local Phase prohibits storing API Keys
      if (updates.openai_api_key || updates.gemini_api_key) {
        return {
          data: null,
          error: new Error('安全性限制：Local Phase 預覽環境無法儲存 API Key。請連線 Supabase 以啟用金鑰持久化。')
        };
      }

      const configs = this.read<GlobalConfig[]>(STORAGE_KEYS.GLOBAL_CONFIG) || [];
      let current: GlobalConfig;

      if (configs.length > 0) {
        current = { ...configs[0], ...updates, updated_at: new Date().toISOString() };
        configs[0] = current;
      } else {
        current = {
          chat_model: 'gpt-4o',
          embedding_model: 'text-embedding-3-small',
          updated_at: new Date().toISOString(),
          ...updates as any
        };
        configs.push(current);
      }

      this.write(STORAGE_KEYS.GLOBAL_CONFIG, configs);
      return { data: current, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async testConnection(): Promise<StorageResponse<ConnectionStatus>> {
    await this.simulateDelay();
    return {
      data: {
        connected: true,
        mode: 'local',
        storage_writable: true,
        message: '已成功連線至 LocalStorage。系統運作正常。'
      },
      error: null
    };
  }

  // Project Settings Methods
  async getProjectConfig(projectId: string): Promise<StorageResponse<ProjectConfig>> {
    await this.simulateDelay();
    try {
      const configs = this.read<ProjectConfig[]>(STORAGE_KEYS.PROJECT_CONFIGS) || [];
      const config = configs.find(c => c.project_id === projectId);

      if (config) return { data: config, error: null };

      // Default project config
      const defaultConfig: ProjectConfig = {
        project_id: projectId,
        schema_name: 'public', // Using public initially but will warn in UI
        isolation_key: `proj_${projectId.substring(0, 8)}`,
        preferences: {
          morning_brief_enabled: true,
          mask_artifacts_default: true,
          notification_frequency: 'daily'
        },
        updated_at: new Date().toISOString()
      };
      return { data: defaultConfig, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async updateProjectConfig(projectId: string, updates: Partial<ProjectConfig>): Promise<StorageResponse<ProjectConfig>> {
    await this.simulateDelay();
    try {
      const configs = this.read<ProjectConfig[]>(STORAGE_KEYS.PROJECT_CONFIGS) || [];
      const index = configs.findIndex(c => c.project_id === projectId);

      let current: ProjectConfig;
      if (index !== -1) {
        current = { ...configs[index], ...updates, updated_at: new Date().toISOString() };
        configs[index] = current;
      } else {
        // Create initial if not exists
        const base = (await this.getProjectConfig(projectId)).data!;
        current = { ...base, ...updates, updated_at: new Date().toISOString() };
        configs.push(current);
      }

      this.write(STORAGE_KEYS.PROJECT_CONFIGS, configs);
      return { data: current, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  // System AI Config Methods
  async getSystemAIConfig(): Promise<StorageResponse<SystemAIConfig | null>> {
    await this.simulateDelay();
    // Local Phase: Return null (no config) instead of error
    // This allows the UI to gracefully show "please connect to Supabase" message
    return {
      data: null,
      error: null
    };
  }

  async updateSystemAIConfig(config: Omit<SystemAIConfig, 'id' | 'created_at' | 'updated_at'>): Promise<StorageResponse<SystemAIConfig>> {
    await this.simulateDelay();
    // Local Phase: Cannot store AI config for security reasons
    return {
      data: null as any,
      error: new Error('Local Phase 不支援儲存 AI 設定。請連線 Supabase 以啟用 API Key 安全儲存功能。')
    };
  }

  async testAIConnection(
    provider: import('./types').AIProvider,
    model: string,
    apiKey: string,
    apiEndpoint?: string
  ): Promise<StorageResponse<{ success: boolean; message: string }>> {
    await this.simulateDelay();
    // Local Phase: Cannot test AI connection
    return {
      data: null as any,
      error: new Error('Local Phase 不支援測試 AI 連線。請連線 Supabase 以啟用此功能。')
    };
  }

  // Development Helper: Initialize Mock Data
  async initializeMockData(force: boolean = false): Promise<void> {
    try {
      // Check if data already exists
      const existingProjects = this.read<Project[]>(STORAGE_KEYS.PROJECTS) || [];
      if (existingProjects.length > 0 && !force) {
        console.log('Mock data already initialized. Skipping.');
        return;
      }

      console.log('Initializing mock data...');

      // Create mock projects with different statuses
      const now = new Date();
      const projects: Project[] = [
        {
          id: 'proj_nmth_001',
          name: '國美館官網改版專案',
          description: '國立臺灣美術館官方網站全面改版，包含展覽系統、典藏資料庫與多語系支援',
          status: 'active',
          pm_id: 'member_pm_001',
          created_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
          updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        },
        {
          id: 'proj_ecommerce_002',
          name: '電商平台開發',
          description: '新一代 B2C 電商平台，支援多金流與會員分級制度',
          status: 'active',
          pm_id: 'member_pm_002',
          created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'proj_legacy_003',
          name: '舊版企業官網',
          description: '2022年企業官網專案，已於2023年底結案',
          status: 'archived',
          pm_id: 'member_pm_001',
          created_at: new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000).toISOString(), // 2 years ago
          updated_at: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ago
        },
        {
          id: 'proj_test_004',
          name: '測試��案（即將刪除）',
          description: '內部測試用專案，將於30天後���久刪除',
          status: 'pending_deletion',
          deleted_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          purge_at: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
          created_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'proj_mobile_005',
          name: '行動應用開發專案',
          description: 'iOS/Android 雙平台行動應用',
          status: 'active',
          pm_id: 'member_pm_002',
          created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      this.write(STORAGE_KEYS.PROJECTS, projects);

      // Create mock members for each project
      const members: Member[] = [
        // 國美館專案成員
        {
          id: 'member_pm_001',
          project_id: 'proj_nmth_001',
          email: 'pm@example.com',
          name: '王專案經理',
          role: 'pm',
          status: 'active',
          joined_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'member_designer_001',
          project_id: 'proj_nmth_001',
          email: 'designer@example.com',
          name: '李設計師',
          role: 'designer',
          status: 'active',
          joined_at: new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'member_engineer_001',
          project_id: 'proj_nmth_001',
          email: 'engineer@example.com',
          name: '張工程師',
          role: 'engineer',
          status: 'active',
          joined_at: new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'member_client_001',
          project_id: 'proj_nmth_001',
          email: 'client@nmth.gov.tw',
          name: '國美館 陳主任',
          role: 'client',
          status: 'active',
          joined_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
        },
        // 電商平台成員
        {
          id: 'member_pm_002',
          project_id: 'proj_ecommerce_002',
          email: 'pm2@example.com',
          name: '林專案經理',
          role: 'pm',
          status: 'active',
          joined_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'member_engineer_002',
          project_id: 'proj_ecommerce_002',
          email: 'engineer2@example.com',
          name: '陳工程師',
          role: 'engineer',
          status: 'active',
          joined_at: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString()
        },
        // 舊版官網成員 (封存專案)
        {
          id: 'member_legacy_001',
          project_id: 'proj_legacy_003',
          email: 'legacy@example.com',
          name: '舊專案負責人',
          role: 'pm',
          status: 'active',
          joined_at: new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000).toISOString()
        },
        // 行動應用成員
        {
          id: 'member_mobile_001',
          project_id: 'proj_mobile_005',
          email: 'mobile@example.com',
          name: '黃工程師',
          role: 'engineer',
          status: 'active',
          joined_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      this.write(STORAGE_KEYS.MEMBERS, members);

      // Create some sample artifacts for 國美館 project
      const artifacts: Artifact[] = [
        {
          id: 'artifact_001',
          project_id: 'proj_nmth_001',
          content_type: 'text/plain',
          original_content: '【會議記錄】2024/12/10 國美館官網改版需求討論\n\n參與人員：陳主任、王專案經理、李設計師\n\n重點決議：\n1. 首頁需採用全螢幕視覺設計，強化藝術氛圍\n2. 展覽系統需支援線上預約與 QR Code 入場\n3. 典藏資料庫需整合圖片辨識 AI 功能\n4. 網站需支援繁中、英文、日文三語系\n5. 需符合無障礙網頁 AA 級規範',
          created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          meta: {
            channel: 'meeting',
            summary: '國美館官網改版需求討論會議記錄',
            source_info: '會議記錄_20241210.txt'
          }
        },
        {
          id: 'artifact_002',
          project_id: 'proj_nmth_001',
          content_type: 'text/plain',
          original_content: '【技術規格文件】國美館官網技術架構\n\n前端：React 18 + TypeScript + Tailwind CSS\n後端：Node.js + Express + PostgreSQL\nCDN：Cloudflare\n部署：AWS EC2 + S3\n\n效能需求：\n- 首頁載入時間 < 2秒\n- Lighthouse 分數 > 90\n- 支援 10,000 同時在線',
          created_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          meta: {
            channel: 'upload',
            source_info: '技術規格_v1.2.pdf',
            uploader_id: 'member_engineer_001'
          }
        }
      ];

      this.write(STORAGE_KEYS.ARTIFACTS, artifacts);

      // Create some sample items (tasks, decisions, etc.) for 國美館
      const items: Item[] = [
        {
          id: 'item_action_001',
          project_id: 'proj_nmth_001',
          type: 'action',
          status: 'in_progress',
          title: '完成頁視覺設計稿',
          description: '設計首頁全螢幕視覺，包含主視覺輪播、快速連結區、最新展覽區塊',
          source_artifact_id: 'artifact_001',
          assignee_id: 'member_designer_001',
          work_package_id: 'wp_001', // 歸屬到「首頁開發」專案工作
          due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        // 子任務：設計稿細項
        {
          id: 'item_action_001_1',
          project_id: 'proj_nmth_001',
          type: 'action',
          status: 'done',
          title: '主視覺輪播設計',
          description: '完成首頁主視覺輪播的 3 個設計方案',
          assignee_id: 'member_designer_001',
          work_package_id: 'wp_001',
          parent_id: 'item_action_001', // 子任務
          due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          created_at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'item_action_001_2',
          project_id: 'proj_nmth_001',
          type: 'action',
          status: 'in_progress',
          title: '快速連結區塊設計',
          description: '設計快速連結區的圖示與排版',
          assignee_id: 'member_designer_001',
          work_package_id: 'wp_001',
          parent_id: 'item_action_001', // 子任務
          due_date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'item_action_002',
          project_id: 'proj_nmth_001',
          type: 'action',
          status: 'not_started',
          title: '首頁前端實作',
          description: '根據設計稿完成首頁的前端開發',
          assignee_id: 'member_engineer_001',
          work_package_id: 'wp_001', // 歸屬到「首頁開發」專案工作
          due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'item_action_003',
          project_id: 'proj_nmth_001',
          type: 'action',
          status: 'open',
          title: '展覽列表頁開發',
          description: '實作展覽列表頁，包含篩選、分頁、卡片展示',
          assignee_id: 'member_engineer_001',
          work_package_id: 'wp_002', // 歸屬到「展覽系統前後台」專案工作
          due_date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'item_action_004',
          project_id: 'proj_nmth_001',
          type: 'action',
          status: 'blocked',
          title: '多語系功能整合',
          description: '整合 i18n 多語系功能，等待翻譯內容',
          assignee_id: 'member_engineer_001',
          work_package_id: 'wp_003', // 歸屬到「多語系系統」專案工作
          due_date: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        // 未歸屬的任務
        {
          id: 'item_action_005',
          project_id: 'proj_nmth_001',
          type: 'action',
          status: 'not_started',
          title: '準備測試環境文件',
          description: '撰寫測試環境的部署與使用說明文件',
          assignee_id: 'member_engineer_001',
          // work_package_id 未設定，屬於「未分類」
          due_date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'low',
          created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'item_decision_001',
          project_id: 'proj_nmth_001',
          type: 'decision',
          status: 'done',
          title: '採用 Next.js 作為前端框架',
          description: '經評估後決定使用 Next.js 14 (App Router) 作為前端框架，支援 SSR 與 ISR 提升 SEO 與效能',
          source_artifact_id: 'artifact_002',
          priority: 'high',
          created_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          meta: {
            category: 'technical',
            scope: 'global',
            status: 'active'
          }
        },
        {
          id: 'item_pending_001',
          project_id: 'proj_nmth_001',
          type: 'pending',
          status: 'not_started',
          title: '等待客戶確認 Logo 使用規範',
          description: '需要國美館提供正式的 Logo 使用規範與品牌色彩指南',
          assignee_id: 'member_pm_001',
          priority: 'medium',
          created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          meta: {
            waiting_on_type: 'client',
            waiting_on_name: '國美館 陳主任',
            expected_response: '提供品牌指南文件'
          }
        }
      ];

      this.write(STORAGE_KEYS.ITEMS, items);

      // Create modules and pages for 國美館 project
      const modules: Module[] = [
        {
          id: 'module_001',
          project_id: 'proj_nmth_001',
          name: '前台展示系統',
          description: '包含首頁、展覽列表、展覽詳情、典藏資料庫等公開頁面',
          status: 'active',
          created_at: new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'module_002',
          project_id: 'proj_nmth_001',
          name: '後台管理系統',
          description: '展覽管理、典藏管理、會員管理、內容管理後台',
          status: 'active',
          created_at: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'module_003',
          project_id: 'proj_nmth_001',
          name: '會員與預約系統',
          description: '會員註冊登入、展覽預約、活動報名功能',
          status: 'active',
          created_at: new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      this.write(STORAGE_KEYS.MODULES, modules);

      const pages: Page[] = [
        {
          id: 'page_001',
          module_id: 'module_001',
          project_id: 'proj_nmth_001',
          name: '首頁',
          description: '官網首頁，包含主視覺、最新展覽、快速連結',
          status: 'designing',
          path: '/',
          created_at: new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'page_002',
          module_id: 'module_001',
          project_id: 'proj_nmth_001',
          name: '展覽列表',
          description: '目前展覽過往展覽列表頁',
          status: 'developing',
          path: '/exhibitions',
          created_at: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'page_003',
          module_id: 'module_001',
          project_id: 'proj_nmth_001',
          name: '展覽詳情頁',
          description: '單一展覽詳細資訊、作展示、預約功能',
          status: 'developing',
          path: '/exhibitions/[id]',
          created_at: new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'page_004',
          module_id: 'module_001',
          project_id: 'proj_nmth_001',
          name: '典藏資料庫',
          description: '典藏作品搜尋、篩選、詳情展示',
          status: 'designing',
          path: '/collections',
          created_at: new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      this.write(STORAGE_KEYS.PAGES, pages);

      // Create work packages for 國美館
      const workPackages: WorkPackage[] = [
        {
          id: 'wp_001',
          project_id: 'proj_nmth_001',
          title: '首頁開發',
          description: '完成首頁所有功能：主視覺輪播、最新展覽、快速連結、Footer',
          owner_id: 'member_engineer_001',
          status: 'in_progress',
          module_id: 'module_001',
          page_id: 'page_001',
          wave: 'Phase 1',
          target_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          completion_rate: 60,
          created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'wp_002',
          project_id: 'proj_nmth_001',
          title: '展覽系統前後台',
          description: '展覽 CRUD、列表、詳情頁、預約功能',
          owner_id: 'member_engineer_001',
          status: 'in_progress',
          module_id: 'module_001',
          wave: 'Phase 2',
          target_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          completion_rate: 35,
          created_at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'wp_003',
          project_id: 'proj_nmth_001',
          title: '多語系系統',
          description: '實作繁中、英文、日文三語系支援，包含 i18n 框架整合與後台編輯介面',
          owner_id: 'member_engineer_001',
          status: 'not_started',
          module_id: 'module_001',
          wave: 'Phase 2',
          target_date: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString(),
          completion_rate: 0,
          created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'wp_004',
          project_id: 'proj_nmth_001',
          title: '典藏資料庫系統',
          description: '實作典藏作品的搜尋、篩選、詳情展示功能，包含圖片辨識 AI 整合',
          owner_id: 'member_engineer_001',
          status: 'in_progress',
          module_id: 'module_001',
          page_id: 'page_004',
          wave: 'Phase 2',
          target_date: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          completion_rate: 20,
          created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'wp_005',
          project_id: 'proj_nmth_001',
          title: '會員與預約系統',
          description: '會員註冊登入、展覽預約、活動報名、QR Code 入場功能',
          owner_id: 'member_engineer_001',
          status: 'not_started',
          module_id: 'module_003',
          wave: 'Phase 3',
          target_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          completion_rate: 0,
          created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'wp_006',
          project_id: 'proj_nmth_001',
          title: '後台管理系統',
          description: '展覽管理、典藏管理、會員管理、內容管理後台介面',
          owner_id: 'member_engineer_001',
          status: 'blocked',
          module_id: 'module_002',
          wave: 'Phase 2',
          target_date: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000).toISOString(),
          completion_rate: 15,
          created_at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'wp_007',
          project_id: 'proj_nmth_001',
          title: '無障礙優化',
          description: '網站無障礙 AA 級規範實作，包含鍵盤操作、螢幕閱讀器支援、對比度優化',
          owner_id: 'member_designer_001',
          status: 'on_hold',
          wave: 'Phase 3',
          target_date: new Date(now.getTime() + 70 * 24 * 60 * 60 * 1000).toISOString(),
          completion_rate: 0,
          created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'wp_008',
          project_id: 'proj_nmth_001',
          title: '效能優化與 SEO',
          description: 'Lighthouse 優化、圖片壓縮、CDN 配置、Meta 標籤、Sitemap 生成',
          owner_id: 'member_engineer_001',
          status: 'not_started',
          wave: 'Phase 3',
          target_date: new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000).toISOString(),
          completion_rate: 0,
          created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      this.write(STORAGE_KEYS.WORK_PACKAGES, workPackages);

      console.log('✅ Mock data initialized successfully!');
      console.log('Projects:', projects.length);
      console.log('Members:', members.length);
      console.log('Artifacts:', artifacts.length);
      console.log('Items:', items.length);
      console.log('Modules:', modules.length);
      console.log('Pages:', pages.length);
      console.log('Work Packages:', workPackages.length);
    } catch (error) {
      console.error('Failed to initialize mock data:', error);
      throw error;
    }
  }

  // File Storage Methods (Local Phase: Base64)
  async uploadFile(projectId: string, file: File): Promise<StorageResponse<{
    artifactId: string;
    storagePath: string;
    fileUrl: string;
    fileSize: number;
  }>> {
    await this.simulateDelay();
    try {
      // Step 1: 產生 artifact ID
      const artifactId = this.generateId();

      // Step 2: 提取副檔名（保留原始檔名供資料庫儲存）
      const originalFileName = file.name;
      const fileExtension = originalFileName.includes('.')
        ? '.' + originalFileName.split('.').pop()
        : '';

      // Step 3: 構建「虛擬」儲存路徑（模擬 Supabase Storage 格式）
      // 格式：local:{projectId}/{artifactId}{extension}
      const safeFileName = `${artifactId}${fileExtension}`;
      const storagePath = `local:${projectId}/${safeFileName}`;

      console.log(`📤 [Local] 上傳檔案: "${originalFileName}" → Storage Key: "${storagePath}"`);

      // Step 4: 讀取檔案為 Base64
      const base64Content = await this.fileToBase64(file);

      // Step 5: 產生 Data URL（本地預覽用）
      const fileUrl = base64Content;

      return {
        data: {
          artifactId,
          storagePath,
          fileUrl,
          fileSize: file.size,
        },
        error: null,
      };
    } catch (err) {
      console.error('uploadFile (Local) exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async getFileUrl(storagePath: string, expiresIn: number = 3600): Promise<StorageResponse<string>> {
    await this.simulateDelay();
    try {
      // Local Phase: 從 Artifact 中取得 Base64 Data URL
      const artifacts = this.read<Artifact[]>(STORAGE_KEYS.ARTIFACTS) || [];
      const artifact = artifacts.find(a => a.storage_path === storagePath);

      if (!artifact || !artifact.file_url) {
        return { data: null, error: new Error('找不到檔案') };
      }

      // Base64 Data URL 永不過期，直接回傳
      return { data: artifact.file_url, error: null };
    } catch (err) {
      console.error('getFileUrl (Local) exception:', err);
      return { data: null, error: err as Error };
    }
  }

  async deleteFile(storagePath: string): Promise<StorageResponse<void>> {
    await this.simulateDelay();
    // Local Phase: 不需要實際刪除，因為 Base64 存在 Artifact 中
    // 刪除 Artifact 時會一併刪除
    return { data: undefined, error: null };
  }

  async refreshFileUrl(artifactId: string): Promise<StorageResponse<string>> {
    await this.simulateDelay();
    try {
      const artifacts = this.read<Artifact[]>(STORAGE_KEYS.ARTIFACTS) || [];
      const artifact = artifacts.find(a => a.id === artifactId);

      if (!artifact) {
        return { data: null, error: new Error('找不到 Artifact') };
      }

      if (!artifact.file_url) {
        return { data: null, error: new Error('此 Artifact 沒有檔案 URL') };
      }

      // Local Phase: Base64 Data URL 永不過期，直接回傳
      return { data: artifact.file_url, error: null };
    } catch (err) {
      console.error('refreshFileUrl (Local) exception:', err);
      return { data: null, error: err as Error };
    }
  }

  // Helper: 將 File 轉換為 Base64 Data URL
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => {
        reject(new Error('檔案讀取失敗'));
      };
      reader.readAsDataURL(file);
    });
  }

  // RAG Methods
  // Local Phase 預覽環境不支援向量嵌入，僅回傳成功模擬
  async embedContent(content: string, sourceId: string, sourceType: 'item' | 'artifact', projectId: string, metadata?: any): Promise<StorageResponse<{ success: boolean }>> {
    await this.simulateDelay();
    // Do nothing for local storage
    return { data: { success: true }, error: null };
  }

  // Local Phase 簡易關鍵字檢索與最近文件回傳
  async queryKnowledgeBase(query: string, projectId: string, threshold?: number, matchCount: number = 5): Promise<StorageResponse<{ documents: any[] }>> {
    await this.simulateDelay();
    try {
      const artifacts = this.read<Artifact[]>(STORAGE_KEYS.ARTIFACTS) || [];

      // 1. Filter by project
      const projectArtifacts = artifacts.filter(a => a.project_id === projectId);

      // 2. Simple keyword matching (case-insensitive)
      const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0);

      let matchedDocs = projectArtifacts.map(artifact => {
        let score = 0;
        const content = (artifact.original_content || '').toLowerCase();
        const title = (artifact.meta?.file_name || artifact.id).toLowerCase();

        keywords.forEach(keyword => {
          if (content.includes(keyword)) score += 2;
          if (title.includes(keyword)) score += 5;
        });

        // Boost recent files slightly
        const ageHours = (Date.now() - new Date(artifact.created_at).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) score += 1;

        return {
          id: artifact.id,
          content: artifact.original_content || '[Binary File]',
          metadata: {
            title: artifact.meta?.file_name || 'Untitled',
            source_id: artifact.id,
            type: artifact.content_type,
            created_at: artifact.created_at
          },
          similarity: score // Fake similarity score
        };
      });

      // 3. Filter by score > 0 or just take top recent if no keywords match
      matchedDocs = matchedDocs.filter(d => d.similarity > 0);

      // If no matches found, return recently added text artifacts as fallback context
      if (matchedDocs.length === 0) {
        matchedDocs = projectArtifacts
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, matchCount)
          .map(artifact => ({
            id: artifact.id,
            content: artifact.original_content || '[Binary File]',
            metadata: {
              title: artifact.meta?.file_name || 'Untitled',
              source_id: artifact.id,
              type: artifact.content_type,
              created_at: artifact.created_at
            },
            similarity: 0.1 // Low score indicates fallback
          }));
      }

      // Sort by score and take top N
      matchedDocs.sort((a, b) => b.similarity - a.similarity);
      const results = matchedDocs.slice(0, matchCount);

      console.log(`[LocalAdapter] Retrieval for "${query}": found ${results.length} docs`);

      return { data: { documents: results }, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  // System Prompts Methods
  async getSystemPrompts(projectId: string): Promise<StorageResponse<SystemPromptConfig>> {
    await this.simulateDelay();
    try {
      // Local Phase: 從 localStorage 讀取
      const prompts = this.read<SystemPromptConfig>(STORAGE_KEYS.SYSTEM_PROMPTS);

      // 🔥 如果沒有設定，回傳預設值 (fallback to prompts.ts)
      if (!prompts) {
        return {
          data: {
            wbs_parser: WBS_PARSER_PROMPT,
            intent_classification: generateSystemPrompt(),
            few_shot_examples: generateFewShotPrompt(),
            prompt_templates: DEFAULT_PROMPT_TEMPLATES // 🔥 新增預設模板
          },
          error: null
        };
      }

      // 🔥 如果 prompt_templates 欄位不存在，補上預設值
      if (!prompts.prompt_templates) {
        prompts.prompt_templates = DEFAULT_PROMPT_TEMPLATES;
      }

      return { data: prompts, error: null };
    } catch (err) {
      console.error('getSystemPrompts (Local) exception:', err);
      return { data: null as any, error: err as Error };
    }
  }

  async updateSystemPrompts(
    projectId: string,
    prompts: Partial<SystemPromptConfig>,
    updatedBy?: string
  ): Promise<StorageResponse<SystemPromptConfig>> {
    await this.simulateDelay();
    try {
      // 先取得現有的 prompts
      const current = this.read<SystemPromptConfig>(STORAGE_KEYS.SYSTEM_PROMPTS) || {
        wbs_parser: '',
        intent_classification: '',
        few_shot_examples: ''
      };

      // 合併更新
      const updated: SystemPromptConfig = {
        ...current,
        ...prompts,
        last_updated_at: new Date().toISOString(),
        updated_by: updatedBy || 'local_user'
      };

      // 儲存到 localStorage
      this.write(STORAGE_KEYS.SYSTEM_PROMPTS, updated);

      return { data: updated, error: null };
    } catch (err) {
      console.error('updateSystemPrompts (Local) exception:', err);
      return { data: null as any, error: err as Error };
    }
  }

  async resetSystemPrompt(
    projectId: string,
    promptKey: keyof SystemPromptConfig,
    defaultValue: string,
    updatedBy?: string
  ): Promise<StorageResponse<SystemPromptConfig>> {
    await this.simulateDelay();
    try {
      // 先取得現有的 prompts
      const current = this.read<SystemPromptConfig>(STORAGE_KEYS.SYSTEM_PROMPTS) || {
        wbs_parser: '',
        intent_classification: '',
        few_shot_examples: ''
      };

      // 重置指定的 prompt
      const updated: SystemPromptConfig = {
        ...current,
        [promptKey]: defaultValue,
        last_updated_at: new Date().toISOString(),
        updated_by: updatedBy || 'local_user'
      };

      // 儲存到 localStorage
      this.write(STORAGE_KEYS.SYSTEM_PROMPTS, updated);

      return { data: updated, error: null };
    } catch (err) {
      console.error('resetSystemPrompt (Local) exception:', err);
      return { data: null as any, error: err as Error };
    }
  }



  async removeMember(id: string): Promise<StorageResponse<void>> {
    try {
      const members = this.read<Member[]>(STORAGE_KEYS.MEMBERS) || [];
      const filtered = members.filter(m => m.id !== id);
      this.write(STORAGE_KEYS.MEMBERS, filtered);
      return { data: undefined, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  }

  async pruneOrphanedFiles(projectId: string): Promise<StorageResponse<{ deletedCount: number }>> {
    return { data: { deletedCount: 0 }, error: null };
  }

  async hardDeleteProject(id: string): Promise<StorageResponse<void>> {
    return this.purgeProject(id);
  }
}