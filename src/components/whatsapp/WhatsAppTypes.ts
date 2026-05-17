export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'marketing' | 'utility' | 'authentication';
  status: 'approved' | 'pending' | 'rejected';
  language: string;
  body: string;
  lastUsed: string;
  sentCount: number;
  hasMedia?: boolean;
  mediaType?: 'image' | 'video' | 'document';
}

export interface MessageLog {
  id: string;
  recipient: string;
  recipientName: string;
  template: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  direction: 'outbound' | 'inbound';
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
}

export interface ClientContact {
  id: string;
  name: string;
  phone: string;
  category: string;
  lastMessage?: string;
  tags: string[];
}

export interface ClientCategory {
  id: string;
  name: string;
  color: string;
  count: number;
}

export const CLIENT_CATEGORIES: ClientCategory[] = [];

export const SAMPLE_CONTACTS: ClientContact[] = [];

export const SAMPLE_TEMPLATES: WhatsAppTemplate[] = [];
