import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Image, Video, FileText, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { statusBadge } from './WhatsAppStatusBadge';
import { WhatsAppTemplate, SAMPLE_TEMPLATES } from './WhatsAppTypes';

export default function WhatsAppTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(SAMPLE_TEMPLATES);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTpl, setNewTpl] = useState({ name: '', category: 'utility' as const, body: '', hasMedia: false, mediaType: '' as string, mediaFile: null as File | null });

  const mediaIcon = (type?: string) => {
    if (type === 'image') return <Image className="w-3.5 h-3.5 text-blue-500" />;
    if (type === 'video') return <Video className="w-3.5 h-3.5 text-purple-500" />;
    if (type === 'document') return <FileText className="w-3.5 h-3.5 text-amber-500" />;
    return null;
  };

  const handleSubmit = () => {
    if (!newTpl.name || !newTpl.body) {
      toast({ title: 'Missing fields', description: 'Template name and body are required', variant: 'destructive' });
      return;
    }
    const tpl: WhatsAppTemplate = {
      id: `TPL-${String(templates.length + 1).padStart(3, '0')}`,
      name: newTpl.name.toLowerCase().replace(/\s+/g, '_'),
      category: newTpl.category,
      status: 'pending',
      language: 'en',
      body: newTpl.body,
      lastUsed: '',
      sentCount: 0,
      hasMedia: newTpl.hasMedia,
      mediaType: newTpl.mediaType as any,
    };
    setTemplates([...templates, tpl]);
    toast({ title: 'Template Submitted', description: 'Sent for WhatsApp approval' });
    setShowNewTemplate(false);
    setNewTpl({ name: '', category: 'utility', body: '', hasMedia: false, mediaType: '', mediaFile: null });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{templates.length} templates configured</p>
        <Button className="gap-2" onClick={() => setShowNewTemplate(true)}><Plus className="w-4 h-4" />New Template</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Template Name</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Media</TableHead>
                <TableHead className="font-semibold">Language</TableHead>
                <TableHead className="font-semibold text-right">Sent</TableHead>
                <TableHead className="font-semibold">Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(tpl => (
                <TableRow key={tpl.id}>
                  <TableCell className="font-mono text-sm">{tpl.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize text-xs">{tpl.category}</Badge></TableCell>
                  <TableCell>{statusBadge(tpl.status)}</TableCell>
                  <TableCell>{tpl.hasMedia ? <div className="flex items-center gap-1">{mediaIcon(tpl.mediaType)}<span className="text-xs capitalize">{tpl.mediaType}</span></div> : <span className="text-xs text-muted-foreground">Text only</span>}</TableCell>
                  <TableCell className="uppercase text-sm">{tpl.language}</TableCell>
                  <TableCell className="text-right font-semibold">{tpl.sentCount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => toast({ title: tpl.name, description: tpl.body })}><Eye className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showNewTemplate} onOpenChange={setShowNewTemplate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Message Template</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input placeholder="e.g., order_update" value={newTpl.name} onChange={e => setNewTpl({ ...newTpl, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newTpl.category} onValueChange={v => setNewTpl({ ...newTpl, category: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="authentication">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea placeholder="Use {{1}}, {{2}} for variables..." rows={4} value={newTpl.body} onChange={e => setNewTpl({ ...newTpl, body: e.target.value })} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="hasMedia" checked={newTpl.hasMedia} onChange={e => setNewTpl({ ...newTpl, hasMedia: e.target.checked })} className="rounded" />
                <Label htmlFor="hasMedia">Include media attachment</Label>
              </div>
              {newTpl.hasMedia && (
                <div className="space-y-3 pl-6 border-l-2 border-accent/30">
                  <div className="space-y-2">
                    <Label>Media Type</Label>
                    <Select value={newTpl.mediaType} onValueChange={v => setNewTpl({ ...newTpl, mediaType: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image (JPG, PNG)</SelectItem>
                        <SelectItem value="video">Video (MP4)</SelectItem>
                        <SelectItem value="document">Document (PDF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Upload File</Label>
                    <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent transition-colors bg-muted/30">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{newTpl.mediaFile ? newTpl.mediaFile.name : 'Click to upload or drag & drop'}</span>
                      <input type="file" className="hidden" accept={newTpl.mediaType === 'image' ? 'image/*' : newTpl.mediaType === 'video' ? 'video/*' : '.pdf,.doc,.docx'} onChange={e => setNewTpl({ ...newTpl, mediaFile: e.target.files?.[0] || null })} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTemplate(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Submit for Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
