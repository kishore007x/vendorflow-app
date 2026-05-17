import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  MapPin, Search, Download, Star, Phone, Globe, Clock, Filter,
  Building2, Navigation, ExternalLink, FileSpreadsheet, Instagram, Facebook,
  Store, TrendingUp, MessageSquare, Eye, ThumbsUp, Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// --- Google Maps Sample Data ---
const mapBusinesses = [
  { id: 1, name: 'Sparkle Home Décor', category: 'Home Furnishing', rating: 4.5, reviews: 342, phone: '+91 98765 43210', address: '45, MG Road, Bengaluru 560001', website: 'www.sparklehome.in', hours: '10 AM - 9 PM', lat: 12.9716, lng: 77.5946, status: 'Open', priceLevel: '₹₹' },
  { id: 2, name: 'Royal Fashion Hub', category: 'Clothing Store', rating: 4.2, reviews: 567, phone: '+91 87654 32109', address: '12, Commercial Street, Bengaluru 560001', website: 'www.royalfashion.com', hours: '10 AM - 10 PM', lat: 12.9810, lng: 77.6094, status: 'Open', priceLevel: '₹₹₹' },
  { id: 3, name: 'TechZone Electronics', category: 'Electronics', rating: 4.0, reviews: 891, phone: '+91 76543 21098', address: '78, SP Road, Bengaluru 560002', website: 'www.techzone.in', hours: '9 AM - 8 PM', lat: 12.9634, lng: 77.5855, status: 'Open', priceLevel: '₹₹' },
  { id: 4, name: 'Green Leaf Organics', category: 'Organic Store', rating: 4.7, reviews: 234, phone: '+91 65432 10987', address: '23, Indiranagar, Bengaluru 560038', website: 'www.greenleaf.co.in', hours: '8 AM - 9 PM', lat: 12.9784, lng: 77.6408, status: 'Open', priceLevel: '₹₹₹' },
  { id: 5, name: 'Quick Bite Café', category: 'Restaurant', rating: 3.8, reviews: 1245, phone: '+91 54321 09876', address: '56, Koramangala, Bengaluru 560034', website: '', hours: '7 AM - 11 PM', lat: 12.9352, lng: 77.6245, status: 'Open', priceLevel: '₹' },
  { id: 6, name: 'Fitness First Gym', category: 'Fitness Center', rating: 4.4, reviews: 456, phone: '+91 43210 98765', address: '89, HSR Layout, Bengaluru 560102', website: 'www.fitnessfirst.in', hours: '5 AM - 10 PM', lat: 12.9121, lng: 77.6446, status: 'Open', priceLevel: '₹₹₹' },
  { id: 7, name: 'Paper World Stationery', category: 'Stationery', rating: 4.1, reviews: 178, phone: '+91 32109 87654', address: '34, Jayanagar, Bengaluru 560041', website: '', hours: '9 AM - 8 PM', lat: 12.9308, lng: 77.5838, status: 'Closed', priceLevel: '₹' },
  { id: 8, name: 'Luxe Beauty Salon', category: 'Beauty Salon', rating: 4.6, reviews: 623, phone: '+91 21098 76543', address: '67, Whitefield, Bengaluru 560066', website: 'www.luxebeauty.in', hours: '9 AM - 8 PM', lat: 12.9698, lng: 77.7500, status: 'Open', priceLevel: '₹₹₹₹' },
  { id: 9, name: 'Chai Corner', category: 'Café', rating: 4.3, reviews: 2100, phone: '+91 10987 65432', address: '12, BTM Layout, Bengaluru 560076', website: '', hours: '6 AM - 11 PM', lat: 12.9166, lng: 77.6101, status: 'Open', priceLevel: '₹' },
  { id: 10, name: 'AutoCare Service Center', category: 'Auto Repair', rating: 3.9, reviews: 312, phone: '+91 98712 34567', address: '90, Electronic City, Bengaluru 560100', website: 'www.autocare.in', hours: '8 AM - 7 PM', lat: 12.8456, lng: 77.6603, status: 'Open', priceLevel: '₹₹' },
];

// --- GMB Sample Data ---
const gmbData = {
  profile: { name: 'VendorFlow Commerce', category: 'E-Commerce Service', rating: 4.4, reviews: 156, verified: true, followers: 1240, photos: 45, posts: 23 },
  insights: { views: 12400, searches: 8900, calls: 234, directions: 567, websiteClicks: 1890, photoViews: 4500 },
  reviews: [
    { author: 'Priya M.', rating: 5, text: 'Excellent vendor management platform! Saved us hours.', date: '2 days ago', replied: true },
    { author: 'Rahul K.', rating: 4, text: 'Good features but onboarding took time.', date: '1 week ago', replied: true },
    { author: 'Sneha R.', rating: 3, text: 'Dashboard is nice but needs more export options.', date: '2 weeks ago', replied: false },
    { author: 'Amit P.', rating: 5, text: 'Best multi-channel management tool we have used!', date: '3 weeks ago', replied: true },
  ],
};

// --- Instagram Sample Data ---
const igData = {
  profile: { followers: 15400, following: 890, posts: 234, engagement: 4.2, reach: 45000 },
  recentPosts: [
    { id: 1, type: 'image', likes: 234, comments: 18, saves: 45, caption: 'New collection launch! 🎉', date: '2 days ago' },
    { id: 2, type: 'reel', likes: 1200, comments: 89, saves: 234, caption: 'Behind the scenes of our warehouse', date: '5 days ago' },
    { id: 3, type: 'carousel', likes: 567, comments: 34, saves: 89, caption: 'Top 5 selling products this month', date: '1 week ago' },
    { id: 4, type: 'image', likes: 345, comments: 23, saves: 56, caption: 'Customer spotlight ⭐', date: '1 week ago' },
  ],
  mentions: [
    { user: '@fashionista_daily', followers: 12000, sentiment: 'positive', text: 'Love the quality of products from @vendorflow!' },
    { user: '@tech_reviewer', followers: 45000, sentiment: 'neutral', text: 'Testing the new wireless earbuds from @vendorflow - review coming soon' },
    { user: '@angry_customer21', followers: 200, sentiment: 'negative', text: 'Worst delivery experience from @vendorflow. Still waiting!' },
  ],
};

// --- Facebook Sample Data ---
const fbData = {
  page: { likes: 23500, followers: 24100, reach: 67000, engagement: 3.8 },
  recentPosts: [
    { id: 1, type: 'photo', reactions: 456, comments: 34, shares: 23, text: 'Festival sale live now!', date: '1 day ago' },
    { id: 2, type: 'video', reactions: 890, comments: 67, shares: 45, text: 'Product demo video', date: '3 days ago' },
    { id: 3, type: 'link', reactions: 123, comments: 12, shares: 8, text: 'Blog: Top trends for 2026', date: '5 days ago' },
  ],
  reviews: [
    { author: 'Meena S.', rating: 5, text: 'Amazing product range and fast delivery!', date: '3 days ago' },
    { author: 'Vijay K.', rating: 4, text: 'Good overall, packaging could be better.', date: '1 week ago' },
    { author: 'Deepa L.', rating: 2, text: 'Return process was very difficult.', date: '2 weeks ago' },
  ],
};

export default function GoogleMapsScraper() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('Bengaluru');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const categories = [...new Set(mapBusinesses.map(b => b.category))];
  const filtered = mapBusinesses.filter(b =>
    (categoryFilter === 'all' || b.category === categoryFilter) &&
    (b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleRow = (id: number) => setSelectedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedRows(filtered.map(b => b.id));

  const handleExport = (format: 'csv' | 'excel' | 'txt') => {
    const data = (selectedRows.length > 0 ? filtered.filter(b => selectedRows.includes(b.id)) : filtered);
    if (format === 'csv' || format === 'txt') {
      const headers = 'Name,Category,Rating,Reviews,Phone,Address,Website,Hours,Status,Price Level\n';
      const rows = data.map(b => `"${b.name}","${b.category}",${b.rating},${b.reviews},"${b.phone}","${b.address}","${b.website}","${b.hours}","${b.status}","${b.priceLevel}"`).join('\n');
      const blob = new Blob([headers + rows], { type: format === 'txt' ? 'text/plain' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `google-maps-data-${new Date().toISOString().slice(0, 10)}.${format === 'txt' ? 'txt' : 'csv'}`; a.click();
      URL.revokeObjectURL(url);
    }
    toast({ title: `Exported ${data.length} records`, description: `Data exported as ${format.toUpperCase()}` });
  };

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => { setIsSearching(false); toast({ title: 'Search Complete', description: `Found ${filtered.length} businesses` }); }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Data Intelligence Hub</h1>
        <p className="text-muted-foreground">Google Maps scraper, Google My Business, Instagram & Facebook insights</p>
      </div>

      <Tabs defaultValue="maps">
        <TabsList className="flex-wrap">
          <TabsTrigger value="maps" className="gap-1.5"><MapPin className="w-4 h-4" />Google Maps</TabsTrigger>
          <TabsTrigger value="gmb" className="gap-1.5"><Store className="w-4 h-4" />Google My Business</TabsTrigger>
          <TabsTrigger value="instagram" className="gap-1.5"><Instagram className="w-4 h-4" />Instagram</TabsTrigger>
          <TabsTrigger value="facebook" className="gap-1.5"><Facebook className="w-4 h-4" />Facebook</TabsTrigger>
        </TabsList>

        {/* Google Maps Tab */}
        <TabsContent value="maps" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Maps Business Scraper</CardTitle>
              <CardDescription>Search & extract business data with export</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search business type or name..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Location" value={searchLocation} onChange={e => setSearchLocation(e.target.value)} className="w-[180px]" />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]"><Filter className="w-4 h-4 mr-1" /><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button className="gap-1.5" onClick={handleSearch} disabled={isSearching}>
                    <Search className="w-4 h-4" />{isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{filtered.length} results in {searchLocation}</span>
                  <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRows([])}>Clear</Button>
                  {selectedRows.length > 0 && <Badge variant="secondary">{selectedRows.length} selected</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('csv')}>
                    <Download className="w-4 h-4" />Export CSV
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('excel')}>
                    <FileSpreadsheet className="w-4 h-4" />Export Excel
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('txt')}>
                    <Download className="w-4 h-4" />Export TXT
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="font-semibold">Business Name</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Rating</TableHead>
                    <TableHead className="font-semibold">Reviews</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">Address</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => (
                    <TableRow key={b.id}>
                      <TableCell><Checkbox checked={selectedRows.includes(b.id)} onCheckedChange={() => toggleRow(b.id)} /></TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{b.name}</p>
                          {b.website && <p className="text-xs text-muted-foreground">{b.website}</p>}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{b.category}</Badge></TableCell>
                      <TableCell><div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500" /><span className="font-bold">{b.rating}</span></div></TableCell>
                      <TableCell>{b.reviews.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{b.phone}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{b.address}</TableCell>
                      <TableCell><Badge variant="outline" className={b.status === 'Open' ? 'text-emerald-600 border-emerald-500/30' : 'text-rose-600 border-rose-500/30'}>{b.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="w-3.5 h-3.5" /></Button>
                          {b.website && <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-3.5 h-3.5" /></Button>}
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Navigation className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google My Business Tab */}
        <TabsContent value="gmb" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{gmbData.insights.views.toLocaleString()}</p><p className="text-xs text-muted-foreground">Profile Views</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-primary">{gmbData.insights.searches.toLocaleString()}</p><p className="text-xs text-muted-foreground">Search Appearances</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-emerald-600">{gmbData.insights.websiteClicks.toLocaleString()}</p><p className="text-xs text-muted-foreground">Website Clicks</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-amber-600">{gmbData.insights.calls}</p><p className="text-xs text-muted-foreground">Phone Calls</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">GMB Profile</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Store className="w-8 h-8 text-primary" /></div>
                <div>
                  <h3 className="font-bold text-lg">{gmbData.profile.name}</h3>
                  <p className="text-sm text-muted-foreground">{gmbData.profile.category}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-4 h-4 text-amber-500" /><span className="font-bold">{gmbData.profile.rating}</span>
                    <span className="text-sm text-muted-foreground">({gmbData.profile.reviews} reviews)</span>
                    {gmbData.profile.verified && <Badge variant="outline" className="text-emerald-600 text-xs">✓ Verified</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Reviews</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {gmbData.reviews.map((r, i) => (
                <div key={i} className="border border-border/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{r.author}</span>
                      <div className="flex">{Array.from({ length: 5 }, (_, j) => <Star key={j} className={`w-3.5 h-3.5 ${j < r.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                      {r.replied && <Badge variant="outline" className="text-xs text-emerald-600">Replied</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instagram Tab */}
        <TabsContent value="instagram" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{(igData.profile.followers / 1000).toFixed(1)}K</p><p className="text-xs text-muted-foreground">Followers</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{igData.profile.posts}</p><p className="text-xs text-muted-foreground">Posts</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-primary">{igData.profile.engagement}%</p><p className="text-xs text-muted-foreground">Engagement Rate</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-emerald-600">{(igData.profile.reach / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Monthly Reach</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-amber-600">{igData.profile.following}</p><p className="text-xs text-muted-foreground">Following</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Posts Performance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {igData.recentPosts.map(p => (
                  <div key={p.id} className="flex items-center justify-between border border-border/50 rounded-lg p-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs capitalize">{p.type}</Badge>
                        <span className="text-xs text-muted-foreground">{p.date}</span>
                      </div>
                      <p className="text-sm">{p.caption}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center"><p className="font-bold">{p.likes}</p><p className="text-xs text-muted-foreground">Likes</p></div>
                      <div className="text-center"><p className="font-bold">{p.comments}</p><p className="text-xs text-muted-foreground">Comments</p></div>
                      <div className="text-center"><p className="font-bold">{p.saves}</p><p className="text-xs text-muted-foreground">Saves</p></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Brand Mentions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {igData.mentions.map((m, i) => (
                  <div key={i} className="border border-border/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{m.user}</span>
                        <span className="text-xs text-muted-foreground">{m.followers.toLocaleString()} followers</span>
                      </div>
                      <Badge variant="outline" className={m.sentiment === 'positive' ? 'text-emerald-600 border-emerald-500/30' : m.sentiment === 'negative' ? 'text-rose-600 border-rose-500/30' : 'text-amber-600 border-amber-500/30'}>{m.sentiment}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{m.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Facebook Tab */}
        <TabsContent value="facebook" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold">{(fbData.page.followers / 1000).toFixed(1)}K</p><p className="text-xs text-muted-foreground">Page Followers</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-primary">{(fbData.page.reach / 1000).toFixed(0)}K</p><p className="text-xs text-muted-foreground">Monthly Reach</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-emerald-600">{fbData.page.engagement}%</p><p className="text-xs text-muted-foreground">Engagement Rate</p></CardContent></Card>
            <Card><CardContent className="pt-5 pb-4"><p className="text-xl font-bold text-amber-600">{(fbData.page.likes / 1000).toFixed(1)}K</p><p className="text-xs text-muted-foreground">Page Likes</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Posts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {fbData.recentPosts.map(p => (
                  <div key={p.id} className="flex items-center justify-between border border-border/50 rounded-lg p-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs capitalize">{p.type}</Badge>
                        <span className="text-xs text-muted-foreground">{p.date}</span>
                      </div>
                      <p className="text-sm">{p.text}</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center"><p className="font-bold">{p.reactions}</p><p className="text-xs text-muted-foreground">Reactions</p></div>
                      <div className="text-center"><p className="font-bold">{p.comments}</p><p className="text-xs text-muted-foreground">Comments</p></div>
                      <div className="text-center"><p className="font-bold">{p.shares}</p><p className="text-xs text-muted-foreground">Shares</p></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Facebook Reviews</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {fbData.reviews.map((r, i) => (
                  <div key={i} className="border border-border/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.author}</span>
                        <div className="flex">{Array.from({ length: 5 }, (_, j) => <Star key={j} className={`w-3.5 h-3.5 ${j < r.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />)}</div>
                      </div>
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
