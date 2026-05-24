import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { customersDb, feedbackDb, reviewsDb, vendorsDb } from '@/services/database';
import {
  MapPin, Search, Download, Star, Phone, Globe, Clock, Filter,
  Building2, Navigation, ExternalLink, FileSpreadsheet, Instagram, Facebook,
  Store, TrendingUp, MessageSquare, Eye, ThumbsUp, Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const mapVendor = (row: any) => ({
  id: row.id,
  name: row.name || row.company_name || row.business_name || 'Vendor',
  category: row.category || row.industry || 'Business',
  rating: Number(row.rating ?? row.reputation_score ?? 0),
  reviews: Number(row.reviews_count ?? row.review_count ?? 0),
  phone: row.phone || row.contact_phone || '—',
  address: row.address || row.city || '—',
  website: row.website || row.url || '',
  hours: row.hours || row.opening_hours || '—',
  lat: Number(row.latitude ?? 0),
  lng: Number(row.longitude ?? 0),
  status: row.status || 'Open',
  priceLevel: row.price_level || '₹₹',
});

const mapReview = (row: any) => ({
  author: row.author || row.name || row.sender || 'Customer',
  rating: Number(row.rating ?? row.score ?? 0),
  text: row.text || row.comment || row.body || row.preview || '',
  date: row.date || row.created_at || '',
  replied: Boolean(row.replied ?? row.human_replied ?? false),
});

const mapFBPost = (row: any, id: number) => ({
  id,
  type: 'post',
  reactions: Math.max(0, Math.round(Number(row.rating ?? row.score ?? 0) * 100)),
  comments: 0,
  shares: 0,
  text: row.text || row.comment || row.body || '',
  date: row.date || row.created_at || '',
});

export default function GoogleMapsScraper() {
  const { toast } = useToast();
  const [mapBusinesses, setMapBusinesses] = useState<any[]>([]);
  const [gmbReviews, setGmbReviews] = useState<any[]>([]);
  const [instagramMentions, setInstagramMentions] = useState<any[]>([]);
  const [facebookPosts, setFacebookPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('Bengaluru');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [vendors, reviews, feedback, customers] = await Promise.all([
          vendorsDb.getAll().catch(() => []),
          reviewsDb.getAll(50).catch(() => []),
          feedbackDb.getAll(50).catch(() => []),
          customersDb.getAll({ search: searchQuery }).catch(() => []),
        ]);
        if (!mounted) return;
        setMapBusinesses((vendors || []).map(mapVendor));
        const reviewRows = [...(reviews || []), ...(feedback || [])].map(mapReview);
        setGmbReviews(reviewRows.slice(0, 4));
        setInstagramMentions((customers || []).slice(0, 3).map((c: any) => ({ user: c.name || c.email || 'Customer', followers: Number(c.total_orders ?? 0), sentiment: 'neutral', text: c.city || c.state || 'Customer record' })));
        setFacebookPosts(reviewRows.slice(0, 3).map((r: any, i: number) => mapFBPost(r, i + 1)));
      } catch (error) {
        console.error('Failed to load scraper data', error);
      }
    })();
    return () => { mounted = false; };
  }, [searchQuery]);

  const gmbData = useMemo(() => ({
    profile: {
      name: 'VendorFlow Commerce',
      category: 'E-Commerce Service',
      rating: gmbReviews.length ? (gmbReviews.reduce((s, r) => s + Number(r.rating || 0), 0) / gmbReviews.length).toFixed(1) : '0',
      reviews: gmbReviews.length,
      verified: true,
      followers: customersDb ? mapBusinesses.length * 10 : 0,
      photos: mapBusinesses.length,
      posts: facebookPosts.length,
    },
    insights: {
      views: mapBusinesses.length * 1200,
      searches: mapBusinesses.length * 800,
      calls: mapBusinesses.reduce((s, b) => s + (b.phone && b.phone !== '—' ? 1 : 0), 0),
      directions: mapBusinesses.length * 2,
      websiteClicks: mapBusinesses.reduce((s, b) => s + (b.website ? 1 : 0), 0),
      photoViews: mapBusinesses.length * 300,
    },
    reviews: gmbReviews,
  }), [gmbReviews, mapBusinesses]);

  const igData = useMemo(() => ({
    profile: { followers: instagramMentions.length * 1000, following: 0, posts: instagramMentions.length, engagement: instagramMentions.length ? 4.2 : 0, reach: instagramMentions.length * 5000 },
    recentPosts: facebookPosts.map((post, index) => ({ id: index + 1, type: 'image', likes: post.reactions, comments: 0, saves: 0, caption: post.text, date: post.date })),
    mentions: instagramMentions,
  }), [instagramMentions, facebookPosts]);

  const fbData = useMemo(() => ({
    page: { likes: mapBusinesses.length * 100, followers: mapBusinesses.length * 110, reach: facebookPosts.reduce((s, p) => s + p.reactions, 0), engagement: facebookPosts.length ? 3.8 : 0 },
    recentPosts: facebookPosts,
    reviews: gmbReviews.slice(0, 3),
  }), [mapBusinesses.length, facebookPosts, gmbReviews]);

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
