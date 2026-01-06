import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Mail, Shield, Trash2, Loader2, Search, Filter, CheckCircle2, XCircle, Clock, MoreVertical, Edit2 } from 'lucide-react';
import { Member, MemberRole, MemberStatus } from '../../lib/storage/types';
import { useProject } from '../context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function MembersPage() {
  const { currentProject, adapter } = useProject();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<MemberRole>('developer');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all');

  useEffect(() => {
    loadMembers();
  }, [currentProject]);

  const loadMembers = async () => {
    if (!currentProject) return;
    setLoading(true);
    const { data } = await adapter.getMembers(currentProject.id);
    setMembers(data || []);
    setLoading(false);
  };

  const handleAddMember = async () => {
    if (!currentProject || !newName || !newEmail) return;

    setIsAdding(true);
    const { error } = await adapter.addMember({
      project_id: currentProject.id,
      name: newName,
      email: newEmail,
      role: newRole,
      status: 'invited'
    });

    setIsAdding(false);
    if (!error) {
      resetForm();
      loadMembers();
      toast.success('邀請已發送');
    } else {
      toast.error('新增失敗');
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewRole('developer');
  };

  const handleUpdateStatus = async (memberId: string, newStatus: MemberStatus) => {
    const { error } = await adapter.updateMember(memberId, { status: newStatus });
    if (!error) {
      toast.success('狀態已更新');
      loadMembers();
    } else {
      toast.error('更新失敗');
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getRoleLabel = (member: Member) => {
    if (member.role === 'other') return member.role_display_name || '其他';
    const labels: Record<string, string> = {
      client: '客戶 (Client)',
      pm: '專案經理 (PM)',
      designer: '設計師 (Designer)',
      engineer: '工程師 (Engineer)'
    };
    return labels[member.role] || member.role;
  };

  const getStatusBadge = (status: MemberStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" /> 已加入</Badge>;
      case 'invited':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200 gap-1"><Clock className="h-3 w-3" /> 邀請中</Badge>;
      case 'disabled':
        return <Badge variant="outline" className="text-muted-foreground gap-1"><XCircle className="h-3 w-3" /> 已停用</Badge>;
    }
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg">請先選擇一個專案</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm text-primary">
            <Users className="h-10 w-10" />
          </div>
          <div>
            <h1>成員管理</h1>
            <p className="text-muted-foreground max-w-lg"><label>管理此專案的團隊成員、角色與指派權限</label></p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>邀請新成員</CardTitle>
            <CardDescription>發送邀請給新的合作夥伴，並設定其在專案中的角色。</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleAddMember(); }} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="uppercase tracking-tight text-muted-foreground">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="example@company.com" 
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)} 
                  required 
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="uppercase tracking-tight text-muted-foreground">姓名</Label>
                <Input 
                  id="name" 
                  placeholder="例如：王小明" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  required 
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="uppercase tracking-tight text-muted-foreground">角色</Label>
                <Select value={newRole} onValueChange={(v: MemberRole) => setNewRole(v)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="選擇角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pm">專案經理 (PM)</SelectItem>
                    <SelectItem value="designer">設計師 (Designer)</SelectItem>
                    <SelectItem value="engineer">工程師 (Engineer)</SelectItem>
                    <SelectItem value="client">客戶 (Client)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isAdding} className="w-full h-11 shadow-sm">
                {isAdding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                確認邀請
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="搜尋姓名或 Email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-background"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-11">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="所有狀態" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有狀態</SelectItem>
              <SelectItem value="active">已加入</SelectItem>
              <SelectItem value="invited">邀請中</SelectItem>
              <SelectItem value="disabled">已停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-4 tracking-wider text-muted-foreground uppercase"><label>成員資訊</label></th>
                <th className="text-left p-4 tracking-wider text-muted-foreground uppercase"><label>角色</label></th>
                <th className="text-left p-4 tracking-wider text-muted-foreground uppercase"><label>狀態</label></th>
                <th className="text-left p-4 tracking-wider text-muted-foreground uppercase"><label>加入日期</label></th>
                <th className="p-4 w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-50" />
                    <p className="mt-2 text-sm text-muted-foreground">載入中...</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2 opacity-60">
                      <Users className="h-12 w-12 mb-2" />
                      <p className="text-lg font-medium">找不到相符的成員</p>
                      <p className="text-sm">試著調整搜尋條件或邀請新夥伴</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm border border-border/50 ${
                          member.status === 'disabled' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary font-bold'
                        }`}>
                          <label>{member.name.charAt(0)}</label>
                        </div>
                        <div className="min-w-0">
                          <p className={`transition-colors ${member.status === 'disabled' ? 'text-muted-foreground' : 'text-foreground font-bold'}`}>
                            {member.name}
                          </p>
                          <p className="text-muted-foreground truncate"><label>{member.email}</label></p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${member.role === 'client' ? 'text-amber-500' : 'text-primary'}`} />
                        <label className="font-medium">{getRoleLabel(member)}</label>
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(member.status)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <label>{new Date(member.joined_at).toLocaleDateString('zh-TW')}</label>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>操作</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {member.status === 'invited' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(member.id, 'active')}>
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                              啟用成員 (設為 Active)
                            </DropdownMenuItem>
                          )}
                          {member.status !== 'disabled' && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateStatus(member.id, 'disabled')}
                              className="text-destructive focus:text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              停用成員 (Disable)
                            </DropdownMenuItem>
                          )}
                          {member.status === 'disabled' && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(member.id, 'active')}>
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                              重新啟用
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="opacity-50 cursor-not-allowed">
                            <Edit2 className="h-4 w-4 mr-2" />
                            編輯資訊 (開發中)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-muted/10 p-4 border-t border-border">
          <p className="text-muted-foreground uppercase tracking-widest">
            <label>總計: {filteredMembers.length} 位成員</label>
          </p>
        </div>
      </div>
    </div>
  );
}