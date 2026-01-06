import { Item, ItemType, ArtifactType, SuggestionDraft } from '../storage/types';
import { DateParser } from './DateParser';

export interface MorningBrief {
  summary: string;
  risks: { title: string; severity: 'low' | 'medium' | 'high'; id?: string; citation?: string }[];
  actions: { 
    title: string; 
    importance: string; 
    id?: string; 
    item_type?: ItemType;
    citation_id?: string;
    citation_label?: string;
  }[];
  stats: {
    completion_rate: number;
    blocked_count: number;
    overdue_count: number;
    pending_client_count: number;
  };
}

export class GeneratorService {
  /**
   * Mock processing of content to generate suggestions.
   * In a real app, this would call an LLM.
   */
  async generateSuggestions(content: string, artifactType: ArtifactType): Promise<SuggestionDraft[]> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const suggestions: SuggestionDraft[] = [];
    const lowerContent = content.toLowerCase();

    // 🔥 解析日期（優先處理）
    const parsedDate = DateParser.extractDate(content);
    const dueDate = parsedDate?.date;

    // keyword matching for "general" (action/task)
    if (lowerContent.includes('bug') || lowerContent.includes('error') || lowerContent.includes('fix') || lowerContent.includes('fail') || 
        lowerContent.includes('開發') || lowerContent.includes('implement') || lowerContent.includes('做') ||
        lowerContent.includes('繳交') || lowerContent.includes('交付') || lowerContent.includes('完成')) {
      suggestions.push({
        type: 'action',
        title: this.extractTitle(content),
        description: this.extractSummary(content, 150),
        confidence: 0.9,
        due_date: dueDate,
        meta: parsedDate ? { 
          extracted_date: parsedDate.raw,
          date_confidence: parsedDate.confidence 
        } : undefined
      });
    }

    // keyword matching for "Pending"
    if (lowerContent.includes('wait') || lowerContent.includes('pending') || lowerContent.includes('等') || 
        lowerContent.includes('確認') || lowerContent.includes('waiting') || lowerContent.includes('回覆')) {
      suggestions.push({
        type: 'pending',
        title: '待確認或待回覆項目',
        description: this.extractSummary(content, 150),
        confidence: 0.85,
        due_date: dueDate
      });
    }

    // keyword matching for "Decision"
    if (lowerContent.includes('agree') || lowerContent.includes('ok') || lowerContent.includes('approve') || 
        lowerContent.includes('決議') || lowerContent.includes('決定') || lowerContent.includes('confirm')) {
      suggestions.push({
        type: 'decision',
        title: '決議記錄',
        description: this.extractSummary(content, 150),
        confidence: 0.8,
        due_date: dueDate
      });
    }

    // keyword matching for "CR" (Change Request)
    if (lowerContent.includes('change') || lowerContent.includes('modify') || lowerContent.includes('變更') || 
        lowerContent.includes('需求') || lowerContent.includes('調整')) {
      suggestions.push({
        type: 'cr',
        title: '需求變更',
        description: this.extractSummary(content, 150),
        confidence: 0.75,
        due_date: dueDate
      });
    }

    // Default: General task (if no specific type matched)
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'action',
        title: this.extractTitle(content),
        description: this.extractSummary(content, 150),
        confidence: 0.6,
        due_date: dueDate
      });
    }

    // If text is very long, add a review task
    if (content.length > 200) {
       suggestions.push({
        type: 'action',
        title: '檢視詳細文件',
        description: '輸入內容較長，建議詳細檢視',
        confidence: 0.5,
        due_date: dueDate
      });
    }

    return suggestions;
  }

  /**
   * Generates a morning brief based on project items (Mock)
   */
  async generateMorningBrief(items: Item[]): Promise<MorningBrief> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    const actions = items.filter(i => i.type === 'general'); // 一般任務項目
    const pendings = items.filter(i => i.type === 'pending');
    const crs = items.filter(i => i.type === 'cr');

    const totalActions = actions.length;
    const doneActions = actions.filter(i => i.status === 'completed').length;
    const completionRate = totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0;
    
    const now = new Date();
    const overdue = actions.filter(i => i.status !== 'completed' && i.due_date && new Date(i.due_date) < now);
    const blocked = actions.filter(i => i.status === 'blocked');
    const pendingClient = pendings.filter(i => i.meta?.waiting_on_type === 'client' && i.status !== 'completed');

    // Mock summary logic
    let summary = '目前專案運作穩定，進度持續推進中。';
    if (blocked.length > 0 || overdue.length > 0) {
      summary = `注意！專案目前有 ${blocked.length} 個卡關事項與 ${overdue.length} 個逾期任務，建議優先處理。`;
    } else if (pendingClient.length > 3) {
      summary = `進度平穩，但目前有 ${pendingClient.length} 項等待客戶回覆，可能影響後續時程。`;
    }

    const risks: MorningBrief['risks'] = [];
    blocked.forEach(b => risks.push({ 
      title: `任務卡關: ${b.title}`, 
      severity: 'high', 
      id: b.id,
      citation: b.source_artifact_id 
    }));
    crs.filter(c => c.meta?.risk_level === 'high').forEach(c => risks.push({ 
      title: `高風險變更: ${c.title}`, 
      severity: 'high', 
      id: c.id,
      citation: c.source_artifact_id
    }));

    const suggestActions: MorningBrief['actions'] = [];
    
    // Priority: Overdue > High Risk CR > Blocked > Long Waiting
    overdue.slice(0, 1).forEach(o => suggestActions.push({ 
      title: `儘速處理逾期: ${o.title}`, 
      importance: '緊急', 
      id: o.id, 
      item_type: o.type,
      citation_id: o.source_artifact_id,
      citation_label: '逾期任務'
    }));

    crs.filter(c => c.meta?.risk_level === 'high' && c.status !== 'completed').slice(0, 1).forEach(c => suggestActions.push({
      title: `評估高風險變更影響: ${c.title}`,
      importance: '關鍵',
      id: c.id,
      item_type: 'cr',
      citation_id: c.source_artifact_id,
      citation_label: '高風險 CR'
    }));

    pendingClient.slice(0, 1).forEach(p => suggestActions.push({ 
      title: `追蹤客戶回覆: ${p.title}`, 
      importance: '待辦', 
      id: p.id,
      item_type: 'pending',
      citation_id: p.source_artifact_id,
      citation_label: '等待中'
    }));

    if (suggestActions.length === 0) {
      suggestActions.push({ 
        title: '檢視今日新產生的建議卡', 
        importance: '一般',
        citation_label: '收件匣'
      });
    }

    // Limit to 3 as per spec
    const finalActions = suggestActions.slice(0, 3);

    return {
      summary,
      risks,
      actions: finalActions,
      stats: {
        completion_rate: completionRate,
        blocked_count: blocked.length,
        overdue_count: overdue.length,
        pending_client_count: pendingClient.length
      }
    };
  }

  /**
   * Masks sensitive information (Mock)
   */
  maskContent(content: string): string {
    let masked = content;
    
    // Mask Emails
    masked = masked.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]');
    
    // Mask potential passwords/tokens (simple heuristic)
    masked = masked.replace(/(password|token|key)\s*[:=]\s*\S+/gi, '$1: [REDACTED]');
    
    // Mask IP addresses
    masked = masked.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]');

    return masked;
  }

  private extractSummary(text: string, length: number): string {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  /**
   * 從文字中提取標題（取第一行或前 50 字）
   */
  private extractTitle(text: string): string {
    // 移除多餘的空白和換行
    const cleaned = text.trim();
    
    // 取第一行作為標題
    const firstLine = cleaned.split('\n')[0];
    
    // 如果第一行太長，截取前 50 字
    const maxLength = 50;
    if (firstLine.length > maxLength) {
      return firstLine.substring(0, maxLength) + '...';
    }
    
    return firstLine || '新任務';
  }
}

export const generatorService = new GeneratorService();