import React, { useState, useMemo } from 'react';
import { ADMIN_MENU_ICONS, getMenuIcon } from '@/lib/admin-menu-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  triggerClassName?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  triggerClassName,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const iconNames = useMemo(() => Object.keys(ADMIN_MENU_ICONS), []);

  const filteredIcons = useMemo(() => {
    if (!searchTerm) return iconNames;
    return iconNames.filter(name =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, iconNames]);

  const selectedIcon = getMenuIcon(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('w-full justify-start gap-2', triggerClassName)}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            {React.createElement(selectedIcon, { className: 'w-4 h-4' })}
          </div>
          <span className="text-xs text-muted-foreground">
            {value || 'Pilih Ikon'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari ikon..."
              className="pl-8 h-8 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <ScrollArea className="h-64 border rounded-md p-2">
            <div className="grid grid-cols-6 gap-2">
              {filteredIcons.map((iconName) => {
                const Icon = ADMIN_MENU_ICONS[iconName];
                const isSelected = value === iconName;

                return (
                  <button
                    key={iconName}
                    onClick={() => {
                      onChange(iconName);
                      setOpen(false);
                      setSearchTerm('');
                    }}
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-md border transition-colors hover:bg-accent',
                      isSelected && 'bg-primary text-primary-foreground border-primary'
                    )}
                    title={iconName}
                  >
                    <div className="relative">
                      {React.createElement(Icon, { className: 'w-4 h-4' })}
                      {isSelected && (
                        <Check className="absolute -top-1 -right-1 w-3 h-3 bg-primary-foreground rounded-full" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {filteredIcons.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Ikon tidak ditemukan
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Total: {filteredIcons.length} ikon
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
