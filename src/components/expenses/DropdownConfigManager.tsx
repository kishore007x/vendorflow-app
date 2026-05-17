import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { dropdownOptionsDb } from '@/services/database';
import { Plus, Trash2, Settings2, Loader2, GripVertical } from 'lucide-react';

const FIELD_TYPES = [
  { key: 'expense_category', label: 'Expense Categories' },
  { key: 'payment_mode', label: 'Payment Modes' },
  { key: 'paid_by', label: 'Paid By Names' },
];

export default function DropdownConfigManager() {
  const { toast } = useToast();
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [activeTab, setActiveTab] = useState('expense_category');

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const data = await dropdownOptionsDb.getAll();
      setOptions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOptions(); }, []);

  const filtered = options.filter(o => o.field_type === activeTab);

  const handleAdd = async () => {
    const label = newItem.trim();
    if (!label) return;
    try {
      await dropdownOptionsDb.create({
        field_type: activeTab,
        label,
        value: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        sort_order: filtered.length,
      });
      setNewItem('');
      toast({ title: 'Added', description: `"${label}" added successfully` });
      fetchOptions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string, label: string) => {
    try {
      await dropdownOptionsDb.delete(id);
      toast({ title: 'Removed', description: `"${label}" removed` });
      fetchOptions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Dropdown Field Configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">Add, edit or remove dropdown options for expense forms</p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {FIELD_TYPES.map(ft => (
              <TabsTrigger key={ft.key} value={ft.key}>{ft.label}</TabsTrigger>
            ))}
          </TabsList>

          {FIELD_TYPES.map(ft => (
            <TabsContent key={ft.key} value={ft.key}>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder={`Add new ${ft.label.toLowerCase()} option...`}
                  value={activeTab === ft.key ? newItem : ''}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <Button size="sm" onClick={handleAdd} disabled={!newItem.trim()}>
                  <Plus className="w-4 h-4 mr-1" />Add
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">
                  No custom options yet. Add your first option above, or the default system values will be used.
                </p>
              ) : (
                <div className="space-y-2">
                  {filtered.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                      <span className="flex-1 text-sm font-medium">{opt.label}</span>
                      <Badge variant="secondary" className="text-xs">{opt.value}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(opt.id, opt.label)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
