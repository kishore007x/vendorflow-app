import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, User, Users, Image, Video, FileText, Paperclip, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SAMPLE_CONTACTS, SAMPLE_TEMPLATES, CLIENT_CATEGORIES, ClientContact } from './WhatsAppTypes';

export default function WhatsAppMessaging() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'one-to-one' | 'broadcast'>('one-to-one');
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const approvedTemplates = SAMPLE_TEMPLATES.filter(t => t.status === 'approved');
  const filteredContacts = SAMPLE_CONTACTS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const categoryContacts = selectedCategory
    ? SAMPLE_CONTACTS.filter(c => c.category === selectedCategory)
    : [];

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectByCategory = (catId: string) => {
    setSelectedCategory(catId);
    const ids = SAMPLE_CONTACTS.filter(c => c.category === catId).map(c => c.id);
    setSelectedContacts(ids);
  };

  const recipientCount = mode === 'one-to-one' ? (selectedContact ? 1 : 0) : selectedContacts.length;

  const handleSend = () => {
    if (recipientCount === 0) {
      toast({ title: 'No recipients', description: 'Please select at least one contact', variant: 'destructive' });
      return;
    }
    if (!selectedTemplate && !customMessage) {
      toast({ title: 'No message', description: 'Select a template or type a custom message', variant: 'destructive' });
      return;
    }
    setShowConfirm(true);
  };

  const confirmSend = () => {
    const tplName = selectedTemplate ? approvedTemplates.find(t => t.id === selectedTemplate)?.name : 'custom';
    toast({
      title: `Message${recipientCount > 1 ? 's' : ''} Sent`,
      description: `${recipientCount} message${recipientCount > 1 ? 's' : ''} queued via template "${tplName}"${attachedFile ? ' with attachment' : ''}`,
    });
    setShowConfirm(false);
    setCustomMessage('');
    setAttachedFile(null);
    setSelectedTemplate('');
  };

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={v => setMode(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="one-to-one" className="gap-1.5"><User className="w-4 h-4" />One-to-One</TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5"><Users className="w-4 h-4" />Broadcast (1-to-Many)</TabsTrigger>
        </TabsList>

        {/* ONE-TO-ONE */}
        <TabsContent value="one-to-one">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Contact List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contacts</CardTitle>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search contacts..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                {filteredContacts.map(c => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/10 ${selectedContact?.id === c.id ? 'bg-accent/20 border-l-2 border-l-accent' : ''}`}
                    onClick={() => setSelectedContact(c)}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{c.name.split(' ').map(n => n[0]).join('')}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{c.category}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Compose */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedContact ? `Message to ${selectedContact.name}` : 'Select a contact'}
                </CardTitle>
                {selectedContact && <CardDescription>{selectedContact.phone} · {selectedContact.category}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-4">
                <ComposeArea
                  templates={approvedTemplates}
                  selectedTemplate={selectedTemplate}
                  onTemplateChange={setSelectedTemplate}
                  customMessage={customMessage}
                  onMessageChange={setCustomMessage}
                  attachedFile={attachedFile}
                  onFileChange={setAttachedFile}
                  fileRef={fileRef}
                />
                <Button className="gap-2 w-full" disabled={!selectedContact} onClick={handleSend}>
                  <Send className="w-4 h-4" />Send Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BROADCAST */}
        <TabsContent value="broadcast">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Category + Contact Selection */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Recipients</CardTitle>
                <CardDescription>Choose by category or individually</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide">Client Categories</Label>
                  <div className="space-y-1.5">
                    {CLIENT_CATEGORIES.map(cat => (
                      <div
                        key={cat.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all border ${selectedCategory === cat.id ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-muted/50'}`}
                        onClick={() => selectByCategory(cat.id)}
                      >
                        <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                        <span className="text-sm flex-1">{cat.name}</span>
                        <Badge variant="secondary" className="text-xs">{cat.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide">Individual Contacts</Label>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {SAMPLE_CONTACTS.map(c => (
                      <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox checked={selectedContacts.includes(c.id)} onCheckedChange={() => toggleContact(c.id)} />
                        <span className="text-sm">{c.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{c.phone}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{selectedContacts.length}</p>
                  <p className="text-xs text-muted-foreground">recipients selected</p>
                </div>
              </CardContent>
            </Card>

            {/* Compose */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Broadcast Message</CardTitle>
                <CardDescription>Send to {selectedContacts.length} selected recipients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ComposeArea
                  templates={approvedTemplates}
                  selectedTemplate={selectedTemplate}
                  onTemplateChange={setSelectedTemplate}
                  customMessage={customMessage}
                  onMessageChange={setCustomMessage}
                  attachedFile={attachedFile}
                  onFileChange={setAttachedFile}
                  fileRef={fileRef}
                />
                <Button className="gap-2 w-full" disabled={selectedContacts.length === 0} onClick={handleSend}>
                  <Send className="w-4 h-4" />Send Broadcast ({selectedContacts.length})
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Send</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            You are about to send {recipientCount} message{recipientCount > 1 ? 's' : ''}
            {attachedFile && <> with attachment <strong>{attachedFile.name}</strong></>}.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={confirmSend}>Confirm & Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComposeArea({ templates, selectedTemplate, onTemplateChange, customMessage, onMessageChange, attachedFile, onFileChange, fileRef }: {
  templates: any[];
  selectedTemplate: string;
  onTemplateChange: (v: string) => void;
  customMessage: string;
  onMessageChange: (v: string) => void;
  attachedFile: File | null;
  onFileChange: (f: File | null) => void;
  fileRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Use Template</Label>
        <Select value={selectedTemplate} onValueChange={onTemplateChange}>
          <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
          <SelectContent>
            {templates.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <span className="font-mono text-xs">{t.name}</span>
                <span className="text-xs text-muted-foreground ml-2">({t.category})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTemplate && (
          <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground border border-border/50">
            {templates.find(t => t.id === selectedTemplate)?.body}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Or Custom Message</Label>
        <Textarea placeholder="Type your message..." rows={3} value={customMessage} onChange={e => onMessageChange(e.target.value)} disabled={!!selectedTemplate} />
      </div>
      <div className="space-y-2">
        <Label>Attach File</Label>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
            <Paperclip className="w-4 h-4" />Attach
          </Button>
          <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" onChange={e => onFileChange(e.target.files?.[0] || null)} />
          {attachedFile && (
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg text-sm">
              {attachedFile.type.startsWith('image') && <Image className="w-4 h-4 text-blue-500" />}
              {attachedFile.type.startsWith('video') && <Video className="w-4 h-4 text-purple-500" />}
              {!attachedFile.type.startsWith('image') && !attachedFile.type.startsWith('video') && <FileText className="w-4 h-4 text-amber-500" />}
              <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              <span className="text-xs text-muted-foreground">({(attachedFile.size / 1024).toFixed(0)} KB)</span>
              <button onClick={() => onFileChange(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
