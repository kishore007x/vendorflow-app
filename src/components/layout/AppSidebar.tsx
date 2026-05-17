import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard, Package, ShoppingCart, BoxIcon, RotateCcw, CreditCard, Users,
  Bell, BarChart3, ListTodo, Globe, MessageSquare, ChevronDown, Search, X,
  Warehouse, Settings, Activity, FileSpreadsheet, Link2, Scale, Upload, Share2,
  Crown, LifeBuoy, Shield, FileText, IndianRupee, Receipt, Code, Camera, Gavel,
  UserPlus, MessageCircle, Building2, Contact, PieChart, Megaphone, Wallet,
  Scissors, Calculator, ArrowUpDown, MapPin, StarIcon, Mail, Video, HardDrive,
  GraduationCap, Store, Tag, Handshake, ClipboardCheck, Banknote,
} from 'lucide-react';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  roles: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavSection {
  heading: string;
  groups: NavGroup[];
}

const navigationSections: NavSection[] = [
  {
    heading: 'Channel Details',
    groups: [
      {
        label: 'Dashboard',
        items: [
          { title: 'Insights', url: '/insights', icon: PieChart, roles: ['admin', 'vendor', 'operations'] },
          { title: 'Channels', url: '/channels', icon: Store, roles: ['admin'] },
        ],
      },
      {
        label: 'Catalog',
        items: [
          { title: 'Products & Catalog', url: '/products-catalog', icon: Package, roles: ['admin', 'vendor'] },
          { title: 'Brands', url: '/brands', icon: Tag, roles: ['admin', 'vendor'] },
          { title: 'Product Health', url: '/product-health', icon: Activity, roles: ['admin', 'vendor', 'operations'] },
          { title: 'SKU Mapping', url: '/sku-mapping', icon: Link2, roles: ['admin', 'vendor'] },
        ],
      },
      {
        label: 'Inventory & Orders',
        items: [
          { title: 'Inventory', url: '/inventory', icon: BoxIcon, roles: ['admin', 'vendor', 'operations'] },
          { title: 'Orders', url: '/orders', icon: ShoppingCart, roles: ['admin', 'vendor', 'operations'] },
          { title: 'Consolidated Orders', url: '/consolidated-orders', icon: FileSpreadsheet, roles: ['admin', 'operations'] },
          { title: 'Returns & Claims', url: '/returns', icon: RotateCcw, roles: ['admin', 'operations'] },
          { title: 'Settlements', url: '/settlements', icon: CreditCard, roles: ['admin', 'vendor'] },
          { title: 'Purchase & Inward', url: '/purchase', icon: Receipt, roles: ['admin', 'vendor', 'operations'] },
        ],
      },
      {
        label: 'Reconciliation',
        items: [
          { title: 'Payment Reconciliation', url: '/reconciliation', icon: Banknote, roles: ['admin', 'operations'] },
          { title: 'Stock Reconciliation', url: '/stock-reconciliation', icon: ClipboardCheck, roles: ['admin', 'operations'] },
        ],
      },
      {
        label: 'Finance',
        items: [
          { title: 'Price & Payout', url: '/price-payout', icon: IndianRupee, roles: ['admin', 'vendor'] },
          { title: 'Finance & Tax', url: '/finance', icon: Receipt, roles: ['admin', 'vendor'] },
          { title: 'Expense Tracking', url: '/expenses', icon: Wallet, roles: ['admin', 'operations'] },
        ],
      },
      {
        label: 'Vendors',
        items: [
          { title: 'Vendor List', url: '/vendors', icon: Users, roles: ['admin'] },
          { title: 'Warehouses', url: '/warehouses', icon: Warehouse, roles: ['admin', 'operations'] },
        ],
      },
      {
        label: 'Marketing',
        items: [
          { title: 'Broadcast Center', url: '/broadcast', icon: Megaphone, roles: ['admin', 'vendor'] },
          { title: 'Email & Social Ads', url: '/email-marketing', icon: Mail, roles: ['admin', 'vendor'] },
          { title: 'Unified Inbox', url: '/social-insights', icon: Share2, roles: ['admin', 'vendor'] },
          { title: 'Marketing Config', url: '/marketing-config', icon: Megaphone, roles: ['admin'] },
          { title: 'Own Website', url: '/ecommerce', icon: Globe, roles: ['admin', 'vendor'] },
          { title: 'Google Meet & AI', url: '/google-meet', icon: Video, roles: ['admin', 'vendor'] },
        ],
      },
      {
        label: 'Reports',
        items: [
          { title: 'Reports & History', url: '/reports', icon: FileText, roles: ['admin', 'vendor', 'operations'] },
          { title: 'Analytics', url: '/analytics', icon: BarChart3, roles: ['admin', 'vendor'] },
          { title: 'Review Analytics', url: '/review-analytics', icon: StarIcon, roles: ['admin', 'vendor'] },
          { title: 'Data Intelligence', url: '/data-intelligence', icon: MapPin, roles: ['admin'] },
        ],
      },
      {
        label: 'Affiliated',
        items: [
          { title: 'Affiliated', url: '/affiliated', icon: Handshake, roles: ['admin', 'vendor'] },
        ],
      },
    ],
  },
  {
    heading: 'Configurations & Uploads',
    groups: [
      {
        label: 'Data Management',
        items: [
          { title: 'Data Import', url: '/data-import', icon: Upload, roles: ['admin', 'operations'] },
          { title: 'Integrations', url: '/integrations', icon: Link2, roles: ['admin', 'vendor'] },
          { title: 'Storage & Drive', url: '/storage', icon: HardDrive, roles: ['admin', 'vendor', 'operations'] },
          { title: 'Video Management', url: '/video-management', icon: Camera, roles: ['admin', 'operations'] },
        ],
      },
      {
        label: 'Operations',
        items: [
          { title: 'Alerts', url: '/alerts', icon: Bell, roles: ['admin', 'vendor', 'operations'] },
          { title: 'Tasks', url: '/tasks', icon: ListTodo, roles: ['admin', 'operations'] },
          { title: 'Lead Management', url: '/leads', icon: UserPlus, roles: ['admin', 'vendor'] },
          { title: 'Customer Database', url: '/customers', icon: Contact, roles: ['admin', 'vendor', 'operations'] },
          { title: 'WhatsApp API', url: '/whatsapp', icon: MessageCircle, roles: ['admin'] },
          { title: 'Staff & Salary', url: '/staff', icon: Scissors, roles: ['admin', 'operations'] },
        ],
      },
      {
        label: 'Admin & Settings',
        items: [
          { title: 'Onboarding', url: '/onboarding', icon: Building2, roles: ['admin'] },
          { title: 'System Settings', url: '/system-settings', icon: Settings, roles: ['admin'] },
          { title: 'Permissions', url: '/permissions', icon: Shield, roles: ['admin'] },
          { title: 'API Settings', url: '/api-settings', icon: Code, roles: ['admin'] },
          { title: 'Legal & Compliance', url: '/legal-compliance', icon: Gavel, roles: ['admin'] },
          { title: 'Subscription', url: '/subscription', icon: Crown, roles: ['admin'] },
          { title: 'AI Hub', url: '/chatbot', icon: MessageSquare, roles: ['admin'] },
          { title: 'Support', url: '/support', icon: LifeBuoy, roles: ['admin', 'vendor', 'operations'] },
          { title: 'Technical Docs', url: '/technical-docs', icon: FileText, roles: ['admin'] },
        ],
      },
    ],
  },
];

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [brandName, setBrandName] = useState('VendorFlow');
  const [brandSubtitle, setBrandSubtitle] = useState('v1.0 • VMS Platform');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const roleFilteredSections = navigationSections.map(section => ({
    ...section,
    groups: section.groups.map(group => ({
      ...group,
      items: group.items.filter(item => user && item.roles.includes(user.role)),
    })).filter(group => group.items.length > 0),
  })).filter(section => section.groups.length > 0);

  const allItems = useMemo(() =>
    roleFilteredSections.flatMap(s => s.groups.flatMap(g => g.items)),
    [roleFilteredSections]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allItems.filter(item => item.title.toLowerCase().includes(q));
  }, [searchQuery, allItems]);

  const filteredSections = searchQuery.trim()
    ? roleFilteredSections.map(section => ({
        ...section,
        groups: section.groups.map(group => ({
          ...group,
          items: group.items.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        })).filter(group => group.items.length > 0),
      })).filter(section => section.groups.length > 0)
    : roleFilteredSections;

  return (
    <Sidebar
      className="border-r"
      style={{
        background: 'linear-gradient(180deg, rgba(43,13,62,0.95) 0%, rgba(43,13,62,0.98) 100%)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderColor: 'rgba(197, 157, 217, 0.12)',
      }}
      collapsible="icon"
    >
      <SidebarHeader className="p-4" style={{ borderBottom: '1px solid rgba(197, 157, 217, 0.12)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => !isCollapsed && setIsEditingBrand(!isEditingBrand)}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 hover:scale-105 cursor-pointer"
            title="Click to edit branding"
            style={{
              background: 'linear-gradient(135deg, #C59DD9 0%, #7A3F91 100%)',
              boxShadow: '0 0 16px rgba(197, 157, 217, 0.4)',
            }}
          >
            <Package className="w-5 h-5 text-white" />
          </button>
          {!isCollapsed && (
            isEditingBrand ? (
              <div className="flex flex-col gap-1">
                <input
                  className="text-sm font-semibold rounded-lg px-1.5 py-0.5 w-[120px]"
                  style={{ background: 'rgba(197,157,217,0.15)', color: 'white', border: '1px solid rgba(197,157,217,0.3)' }}
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  onBlur={() => setIsEditingBrand(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingBrand(false)}
                  autoFocus
                />
                <input
                  className="text-[10px] rounded-lg px-1.5 py-0.5 w-[120px]"
                  style={{ background: 'rgba(197,157,217,0.1)', color: 'rgba(197,157,217,0.7)', border: '1px solid rgba(197,157,217,0.2)' }}
                  value={brandSubtitle}
                  onChange={(e) => setBrandSubtitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingBrand(false)}
                />
              </div>
            ) : (
              <div className="flex flex-col cursor-pointer" onClick={() => setIsEditingBrand(true)} title="Click to edit">
                <span className="font-bold text-white">{brandName}</span>
                <span className="text-xs" style={{ color: 'rgba(197, 157, 217, 0.7)' }}>{brandSubtitle}</span>
              </div>
            )
          )}
        </div>
      </SidebarHeader>

      {/* Search Bar */}
      {!isCollapsed && (
        <div className="px-3 pb-2 pt-2" style={{ borderBottom: '1px solid rgba(197, 157, 217, 0.08)' }}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(197, 157, 217, 0.5)' }} />
            <input
              placeholder="Search tabs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full h-8 pl-8 pr-8 text-xs rounded-xl outline-none transition-all duration-200 focus:ring-1"
              style={{
                background: 'rgba(197, 157, 217, 0.08)',
                border: '1px solid rgba(197, 157, 217, 0.12)',
                color: 'white',
                caretColor: '#C59DD9',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(197, 157, 217, 0.5)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchQuery.trim() && searchResults.length > 0 && (
            <div
              className="mt-1.5 rounded-xl py-1 max-h-[240px] overflow-y-auto z-50"
              style={{
                background: 'rgba(43, 13, 62, 0.95)',
                border: '1px solid rgba(197, 157, 217, 0.15)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {searchResults.map(item => {
                const isActive = location.pathname === item.url;
                return (
                  <button
                    key={item.url}
                    onClick={() => { navigate(item.url); setSearchQuery(''); setIsSearchOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all duration-200"
                    style={{
                      color: isActive ? '#C59DD9' : 'rgba(255,255,255,0.7)',
                      background: isActive ? 'rgba(197,157,217,0.12)' : 'transparent',
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>
          )}
          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: 'rgba(197, 157, 217, 0.4)' }}>No tabs found</p>
          )}
        </div>
      )}

      <SidebarContent className="px-2 py-2 scrollbar-thin">
        {filteredSections.map((section, sectionIndex) => (
          <div key={section.heading}>
            {!isCollapsed && (
              <div className={`px-3 py-2.5 ${sectionIndex > 0 ? 'mt-3 pt-4' : ''}`}
                style={sectionIndex > 0 ? { borderTop: '1px solid rgba(197, 157, 217, 0.08)' } : {}}
              >
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(220, 190, 240, 0.85)' }}>
                  {section.heading}
                </span>
              </div>
            )}
            {isCollapsed && sectionIndex > 0 && (
              <div className="my-2 mx-2" style={{ borderTop: '1px solid rgba(197, 157, 217, 0.08)' }} />
            )}
            {section.groups.map((group, index) => (
              <Collapsible key={group.label} defaultOpen={sectionIndex === 0 && index < 2} className="group/collapsible">
                <SidebarGroup className="p-0">
                  {!isCollapsed ? (
                    <CollapsibleTrigger
                      className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
                      style={{ color: 'rgba(220, 190, 240, 0.8)' }}
                    >
                      {group.label}
                      <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                    </CollapsibleTrigger>
                  ) : null}
                  <CollapsibleContent className="transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => {
                          const isActive = location.pathname === item.url;
                          return (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={item.title}
                              >
                                <a
                                  href={item.url}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(item.url);
                                  }}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                                  style={isActive ? {
                                    background: 'linear-gradient(135deg, #C59DD9 0%, #7A3F91 100%)',
                                    color: 'white',
                                    fontWeight: 500,
                                    boxShadow: '0 0 20px rgba(197, 157, 217, 0.3), 0 4px 12px rgba(122, 63, 145, 0.2)',
                                  } : {
                                    color: 'rgba(255, 255, 255, 0.9)',
                                  }}
                                >
                                  <item.icon className="w-4 h-4 shrink-0" />
                                  {!isCollapsed && <span>{item.title}</span>}
                                </a>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            ))}
          </div>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
