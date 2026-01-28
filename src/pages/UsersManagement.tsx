import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePagination } from '@/hooks/usePagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Search, Edit, UserPlus, Loader2, Upload, X, Image, FileText } from 'lucide-react';
import { Profile, AppRole, ROLE_LABELS } from '@/types/database';
import TablePagination from '@/components/TablePagination';
import { z } from 'zod';
import { cn } from '@/lib/utils';

interface UserWithRole extends Profile {
  role: AppRole;
  photo_url?: string | null;
  national_id_url?: string | null;
}

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['super_agent', 'sales_assistant', 'sales_agent']),
});

export default function UsersManagement() {
  const { toast } = useToast();
  const { session } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editRole, setEditRole] = useState<AppRole>('sales_agent');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Create user state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'sales_agent' as AppRole,
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  
  // Photo/ID upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idFileName, setIdFileName] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');
    
    if (profiles && roles) {
      const usersWithRoles: UserWithRole[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as AppRole) || 'sales_agent',
          photo_url: (profile as any).photo_url || null,
          national_id_url: (profile as any).national_id_url || null,
        };
      });
      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    
    const { error } = await supabase
      .from('user_roles')
      .update({ role: editRole })
      .eq('user_id', editingUser.id);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'User role updated successfully' });
      setDialogOpen(false);
      fetchUsers();
    }
  };

  const validateCreateForm = () => {
    try {
      createUserSchema.parse(newUser);
      setCreateErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            errors[e.path[0] as string] = e.message;
          }
        });
        setCreateErrors(errors);
      }
      return false;
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Error', description: 'Photo must be less than 5MB', variant: 'destructive' });
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Error', description: 'File must be less than 5MB', variant: 'destructive' });
        return;
      }
      setIdFile(file);
      setIdFileName(file.name);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('agent-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('agent-documents')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleCreateUser = async () => {
    if (!validateCreateForm()) return;
    
    setCreating(true);
    try {
      // First upload files if any
      let photoUrl: string | null = null;
      let nationalIdUrl: string | null = null;

      if (photoFile || idFile) {
        setUploadingFiles(true);
        if (photoFile) {
          photoUrl = await uploadFile(photoFile, 'photos');
        }
        if (idFile) {
          nationalIdUrl = await uploadFile(idFile, 'national-ids');
        }
        setUploadingFiles(false);
      }

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          fullName: newUser.fullName,
          phone: newUser.phone || undefined,
          role: newUser.role,
          photoUrl,
          nationalIdUrl,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ 
        title: 'User Created', 
        description: `${newUser.fullName} has been registered as ${ROLE_LABELS[newUser.role]}` 
      });
      
      setCreateDialogOpen(false);
      resetCreateForm();
      fetchUsers();
    } catch (error: any) {
      toast({ 
        title: 'Failed to create user', 
        description: error.message || 'An error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setCreating(false);
      setUploadingFiles(false);
    }
  };

  const resetCreateForm = () => {
    setNewUser({ email: '', password: '', fullName: '', phone: '', role: 'sales_agent' });
    setPhotoFile(null);
    setPhotoPreview(null);
    setIdFile(null);
    setIdFileName(null);
    setCreateErrors({});
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const pagination = usePagination(filteredUsers, { initialPageSize: 10 });

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'super_agent': return 'default';
      case 'sales_assistant': return 'secondary';
      case 'sales_agent': return 'outline';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Users Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage system users and their roles</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <UserPlus className="w-4 h-4" />
              Register New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New User</DialogTitle>
              <DialogDescription>
                Create a new user account. They will be able to sign in immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Full Name</Label>
                <Input
                  id="create-name"
                  placeholder="Enter full name"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                  className={createErrors.fullName ? 'border-destructive' : ''}
                />
                {createErrors.fullName && <p className="text-sm text-destructive">{createErrors.fullName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className={createErrors.email ? 'border-destructive' : ''}
                />
                {createErrors.email && <p className="text-sm text-destructive">{createErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone (optional)</Label>
                <Input
                  id="create-phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={newUser.phone}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  placeholder="Create a password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className={createErrors.password ? 'border-destructive' : ''}
                />
                {createErrors.password && <p className="text-sm text-destructive">{createErrors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Select 
                  value={newUser.role} 
                  onValueChange={(v) => setNewUser(prev => ({ ...prev, role: v as AppRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_agent">Super Agent (Admin)</SelectItem>
                    <SelectItem value="sales_assistant">Sales Assistant</SelectItem>
                    <SelectItem value="sales_agent">Sales Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label>Photo (optional)</Label>
                {photoPreview ? (
                  <div className="relative w-20 h-20">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload photo</span>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">Max 5MB, JPG/PNG</p>
              </div>

              {/* National ID Upload */}
              <div className="space-y-2">
                <Label>National ID (optional)</Label>
                {idFileName ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">{idFileName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setIdFile(null);
                        setIdFileName(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload ID</span>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleIdChange}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">Max 5MB, JPG/PNG/PDF</p>
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetCreateForm(); }} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={creating || uploadingFiles}>
                {(creating || uploadingFiles) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploadingFiles ? 'Uploading...' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_agent">Super Agent</SelectItem>
                <SelectItem value="sales_assistant">Sales Assistant</SelectItem>
                <SelectItem value="sales_agent">Sales Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-[700px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedData.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {ROLE_LABELS[user.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Dialog open={dialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                                setDialogOpen(open);
                                if (open) {
                                  setEditingUser(user);
                                  setEditRole(user.role);
                                }
                              }}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit User Role</DialogTitle>
                                    <DialogDescription>
                                      Update the role for {user.full_name || user.email}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Role</Label>
                                      <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="super_agent">Super Agent (Admin)</SelectItem>
                                          <SelectItem value="sales_assistant">Sales Assistant</SelectItem>
                                          <SelectItem value="sales_agent">Sales Agent</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleUpdateRole}>Save Changes</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              <TablePagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                pageSizeOptions={pagination.pageSizeOptions}
                canGoNext={pagination.canGoNext}
                canGoPrev={pagination.canGoPrev}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                onNextPage={pagination.nextPage}
                onPrevPage={pagination.prevPage}
                onFirstPage={pagination.firstPage}
                onLastPage={pagination.lastPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
