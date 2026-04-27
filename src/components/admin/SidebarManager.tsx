import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from '@hello-pangea/dnd';
import { 
  GripVertical, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Layout,
  Menu as MenuIcon,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getMenuIcon } from '@/lib/admin-menu-icons';

interface MenuItem {
  id: string;
  key: string;
  label: string;
  path: string;
  group_name: string;
  sort_order: number;
  icon?: string;
  required_permission: string;
}

interface MenuGroup {
  name: string;
  items: MenuItem[];
}

export const SidebarManager = () => {
  const queryClient = useQueryClient();
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: dbMenus, isLoading, refetch } = useQuery({
    queryKey: ['admin-sidebar-items-raw'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as MenuItem[];
    }
  });

  useEffect(() => {
    if (dbMenus) {
      const grouped = dbMenus.reduce((acc: MenuGroup[], item) => {
        const group = acc.find(g => g.name === item.group_name);
        if (group) {
          group.items.push(item);
        } else {
          acc.push({ name: item.group_name, items: [item] });
        }
        return acc;
      }, []);

      // Sort groups based on the minimum sort_order of their items
      grouped.sort((a, b) => {
        const minA = Math.min(...a.items.map(i => i.sort_order));
        const minB = Math.min(...b.items.map(i => i.sort_order));
        return minA - minB;
      });

      // Ensure items within groups are sorted by sort_order
      grouped.forEach(g => g.items.sort((a, b) => a.sort_order - b.sort_order));
      
      setGroups(grouped);
    }
  }, [dbMenus]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;

    if (type === 'group') {
      const newGroups = Array.from(groups);
      const [removed] = newGroups.splice(source.index, 1);
      newGroups.splice(destination.index, 0, removed);
      setGroups(newGroups);
      return;
    }

    const sourceGroupIndex = groups.findIndex(g => g.name === source.droppableId);
    const destGroupIndex = groups.findIndex(g => g.name === destination.droppableId);

    if (sourceGroupIndex === -1 || destGroupIndex === -1) return;

    const newGroups = Array.from(groups);
    const sourceItems = Array.from(newGroups[sourceGroupIndex].items);
    const [removed] = sourceItems.splice(source.index, 1);

    if (sourceGroupIndex === destGroupIndex) {
      sourceItems.splice(destination.index, 0, removed);
      newGroups[sourceGroupIndex].items = sourceItems;
    } else {
      const destItems = Array.from(newGroups[destGroupIndex].items);
      removed.group_name = newGroups[destGroupIndex].name;
      destItems.splice(destination.index, 0, removed);
      newGroups[sourceGroupIndex].items = sourceItems;
      newGroups[destGroupIndex].items = destItems;
    }

    setGroups(newGroups);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Re-calculate sort orders based on the current UI state
      const menuItemsToSync = groups.flatMap((group, groupIdx) => 
        group.items.map((item, itemIdx) => ({
          key: item.key,
          label: item.label,
          path: item.path,
          icon: item.icon,
          group_name: group.name,
          sort_order: (groupIdx * 100) + itemIdx,
          required_permission: item.required_permission
        }))
      );

      // Use the RPC for bulk synchronization
      const { data, error } = await (supabase.rpc as any)('bulk_sync_menu_items', {
        _menu_items: menuItemsToSync
      });
      
      if (error) throw error;

      toast.success('Susunan sidebar berhasil disimpan');
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-items-raw'] });
      refetch();
    } catch (error: any) {
      console.error('Error saving sidebar order:', error);
      toast.error('Gagal menyimpan susunan sidebar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGroupNameChange = (index: number, newName: string) => {
    const newGroups = Array.from(groups);
    newGroups[index].name = newName;
    // Also update group_name for all items in this group
    newGroups[index].items.forEach(item => {
      item.group_name = newName;
    });
    setGroups(newGroups);
  };

  const addNewGroup = () => {
    setGroups([...groups, { name: 'Grup Baru', items: [] }]);
  };

  const removeGroup = (index: number) => {
    if (groups[index].items.length > 0) {
      toast.error('Grup tidak bisa dihapus karena masih memiliki menu. Pindahkan menu ke grup lain terlebih dahulu.');
      return;
    }
    const newGroups = Array.from(groups);
    newGroups.splice(index, 1);
    setGroups(newGroups);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-lg font-medium">Memuat susunan menu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pengaturan Sidebar</h2>
          <p className="text-muted-foreground">
            Atur susunan dan pengelompokan menu sidebar dengan drag and drop.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addNewGroup}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Grup
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="all-groups" type="group">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {groups.map((group, index) => (
                <Draggable key={group.name} draggableId={group.name} index={index}>
                  {(provided) => (
                    <Card 
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex flex-col h-full border-2 border-muted/50 hover:border-primary/20 transition-colors"
                    >
                      <CardHeader className="p-4 pb-2 space-y-0">
                        <div className="flex items-center gap-2">
                          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <Input 
                            value={group.name}
                            onChange={(e) => handleGroupNameChange(index, e.target.value)}
                            className="h-8 font-bold text-sm bg-transparent border-none focus-visible:ring-1 px-2"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeGroup(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-2 flex-1">
                        <Droppable droppableId={group.name} type="item">
                          {(provided, snapshot) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className={cn(
                                "min-h-[100px] rounded-md p-2 transition-colors space-y-2",
                                snapshot.isDraggingOver ? "bg-primary/5 border-2 border-dashed border-primary/20" : "bg-muted/30"
                              )}
                            >
                              {group.items.map((item, itemIndex) => (
                                <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        "flex items-center gap-3 p-3 bg-card border rounded-lg shadow-sm transition-all",
                                        snapshot.isDragging ? "ring-2 ring-primary shadow-lg z-50" : "hover:border-primary/30"
                                      )}
                                    >
                                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                                        {React.createElement(getMenuIcon(item.icon), { className: "w-4 h-4 text-primary" })}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.label}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono truncate">{item.key}</p>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              {group.items.length === 0 && (
                                <div className="h-24 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground text-xs">
                                  Tarik menu ke sini
                                </div>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
