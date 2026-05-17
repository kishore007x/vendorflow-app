import { useState, useSyncExternalStore, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Store, Plus, Pencil, Trash2, Upload, Image, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getChannels, subscribeChannels, addChannel, updateChannel, removeChannel, resetChannels, generateChannelId, AVAILABLE_ICONS, AVAILABLE_COLORS } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { PortalConfig } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export default function ChannelManagement() {
  const { toast } = useToast();
  const channels = useSyncExternalStore(subscribeChannels, getChannels);
  const [editingChannel, setEditingChannel] = useState<PortalConfig | null>(null);
  const [addingChannel, setAddingChannel] = useState(false);
  const [channelForm, setChannelForm] = useState({ name: '', icon: '🏪', color: 'hsl(33, 100%, 50%)', logoUrl: '' });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Store className="w-6 h-6" /> Channel Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add, edit, and customize your sales channels & marketplace portals. Changes apply across the entire platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { resetChannels(); toast({ title: 'Channels Reset', description: 'All channels restored to defaults.' }); }}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Defaults
          </Button>
          <Button size="sm" onClick={() => { setChannelForm({ name: '', icon: '🏪', color: 'hsl(33, 100%, 50%)', logoUrl: '' }); setAddingChannel(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Channel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{channels.length}</p>
              <p className="text-xs text-muted-foreground">Total Channels</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Image className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{channels.filter(c => c.logoUrl).length}</p>
              <p className="text-xs text-muted-foreground">With Custom Logo</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{channels.filter(c => !c.logoUrl).length}</p>
              <p className="text-xs text-muted-foreground">Using Fallback Icon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Active Channels</CardTitle>
          <CardDescription>These channels appear in all filters, reports, and dashboards across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {channels.map((ch) => (
              <div key={ch.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all duration-200 group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: ch.color + '15', border: `1px solid ${ch.color}30` }}>
                  <ChannelIcon channelId={ch.id} fallbackIcon={ch.icon} logoUrl={ch.logoUrl} size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">{ch.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{ch.id}</div>
                  {ch.logoUrl ? (
                    <Badge variant="secondary" className="text-[10px] h-5 mt-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Custom Logo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-5 mt-1">Emoji Icon</Badge>
                  )}
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingChannel(ch); setChannelForm({ name: ch.name, icon: ch.icon, color: ch.color, logoUrl: ch.logoUrl || '' }); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                    removeChannel(ch.id as string);
                    toast({ title: 'Channel Removed', description: `${ch.name} has been removed.` });
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {channels.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No channels configured. Click "Add Channel" or "Reset Defaults" to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={addingChannel || !!editingChannel} onOpenChange={(open) => { if (!open) { setAddingChannel(false); setEditingChannel(null); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChannel ? 'Edit Channel' : 'Add New Channel'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Channel Name</Label>
              <Input value={channelForm.name} onChange={e => setChannelForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Shopify, Snapdeal" />
            </div>

            {/* Logo Upload */}
            <div>
              <Label>Channel Logo</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20 overflow-hidden">
                  {channelForm.logoUrl ? (
                    <img src={channelForm.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Image className="w-5 h-5 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast({ title: 'File too large', description: 'Logo must be under 2MB.', variant: 'destructive' });
                        return;
                      }
                      setUploadingLogo(true);
                      try {
                        const ext = file.name.split('.').pop() || 'png';
                        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                        const { error } = await supabase.storage.from('channel-logos').upload(fileName, file, { upsert: true });
                        if (error) throw error;
                        const { data: urlData } = supabase.storage.from('channel-logos').getPublicUrl(fileName);
                        setChannelForm(f => ({ ...f, logoUrl: urlData.publicUrl }));
                        toast({ title: 'Logo uploaded', description: 'Channel logo has been uploaded.' });
                      } catch (err: any) {
                        toast({ title: 'Upload failed', description: err.message || 'Failed to upload logo.', variant: 'destructive' });
                      } finally {
                        setUploadingLogo(false);
                        if (logoInputRef.current) logoInputRef.current.value = '';
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => logoInputRef.current?.click()} className="gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                  {channelForm.logoUrl && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => setChannelForm(f => ({ ...f, logoUrl: '' }))}>
                      Remove
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground">PNG, JPG up to 2MB. Used across the app.</p>
                </div>
              </div>
            </div>

            <div>
              <Label>Fallback Icon</Label>
              <p className="text-xs text-muted-foreground mb-2">Used when no logo is uploaded</p>
              <div className="grid grid-cols-9 gap-1.5 p-3 rounded-lg border bg-muted/30 max-h-40 overflow-y-auto">
                {AVAILABLE_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setChannelForm(f => ({ ...f, icon }))}
                    className={`w-9 h-9 rounded-md flex items-center justify-center text-lg transition-all ${
                      channelForm.icon === icon ? 'bg-primary text-primary-foreground ring-2 ring-primary scale-110' : 'hover:bg-muted'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Or type a custom emoji / text icon:</Label>
                <Input value={channelForm.icon} onChange={e => setChannelForm(f => ({ ...f, icon: e.target.value }))} className="mt-1" maxLength={4} />
              </div>
            </div>

            <div>
              <Label>Brand Color</Label>
              <div className="grid grid-cols-8 gap-2 mt-2">
                {AVAILABLE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setChannelForm(f => ({ ...f, color }))}
                    className={`w-8 h-8 rounded-full transition-all ${
                      channelForm.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div className="p-3 rounded-lg border bg-muted/20">
              <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
              <div className="flex items-center gap-2">
                {channelForm.logoUrl ? (
                  <img src={channelForm.logoUrl} alt="preview" className="w-6 h-6 object-contain rounded" />
                ) : (
                  <span className="text-xl">{channelForm.icon}</span>
                )}
                <span className="font-medium text-foreground">{channelForm.name || 'Channel Name'}</span>
                <div className="w-4 h-4 rounded-full ml-auto" style={{ backgroundColor: channelForm.color }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddingChannel(false); setEditingChannel(null); }}>Cancel</Button>
            <Button disabled={!channelForm.name.trim() || uploadingLogo} onClick={() => {
              if (editingChannel) {
                updateChannel(editingChannel.id as string, { name: channelForm.name, icon: channelForm.icon, color: channelForm.color, logoUrl: channelForm.logoUrl || undefined });
                toast({ title: 'Channel Updated', description: `${channelForm.name} has been updated.` });
                setEditingChannel(null);
              } else {
                const id = generateChannelId(channelForm.name);
                if (channels.find(c => c.id === id)) {
                  toast({ title: 'Duplicate ID', description: `A channel with ID "${id}" already exists.`, variant: 'destructive' });
                  return;
                }
                addChannel({ id: id as any, name: channelForm.name, icon: channelForm.icon, color: channelForm.color, logoUrl: channelForm.logoUrl || undefined });
                toast({ title: 'Channel Added', description: `${channelForm.name} has been added.` });
                setAddingChannel(false);
              }
            }}>
              {editingChannel ? 'Save Changes' : 'Add Channel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
