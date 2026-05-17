import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  HardDrive, FolderOpen, Image, FileText, Film, ShieldCheck, Upload, Search,
  Cloud, ExternalLink, RefreshCw, Trash2, Download, Eye
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const buckets = [
  { id: "product-images", name: "Product Images", isPublic: true, icon: Image, color: "text-blue-500", files: 128, size: "245 MB", used: 24.5 },
  { id: "documents", name: "Documents", isPublic: false, icon: FileText, color: "text-amber-500", files: 67, size: "89 MB", used: 8.9 },
  { id: "invoices", name: "Invoices", isPublic: false, icon: FileText, color: "text-emerald-500", files: 312, size: "156 MB", used: 15.6 },
  { id: "return-evidence", name: "Return Evidence", isPublic: false, icon: ShieldCheck, color: "text-red-500", files: 45, size: "78 MB", used: 7.8 },
  { id: "order-videos", name: "Order Videos", isPublic: false, icon: Film, color: "text-purple-500", files: 23, size: "1.2 GB", used: 120 },
];

const totalUsed = 496.8;
const totalCapacity = 5000;

const recentFiles = [
  { name: "INV-2026-0412.pdf", bucket: "invoices", size: "342 KB", uploaded: "2026-03-19", type: "PDF" },
  { name: "product-hero-blue.jpg", bucket: "product-images", size: "1.8 MB", uploaded: "2026-03-18", type: "Image" },
  { name: "return-RET-0089.mp4", bucket: "return-evidence", size: "12 MB", uploaded: "2026-03-18", type: "Video" },
  { name: "PO-2026-0034.pdf", bucket: "documents", size: "156 KB", uploaded: "2026-03-17", type: "PDF" },
  { name: "packing-video-ORD-5543.mp4", bucket: "order-videos", size: "45 MB", uploaded: "2026-03-17", type: "Video" },
  { name: "SKU-BATCH-MARCH.xlsx", bucket: "documents", size: "89 KB", uploaded: "2026-03-16", type: "Spreadsheet" },
];

const driveFeatures = [
  { title: "Google Drive Sync", desc: "Auto-sync invoices, reports, and documents to Google Drive folders", status: "coming_soon" },
  { title: "OneDrive Integration", desc: "Connect Microsoft OneDrive for centralized file storage", status: "coming_soon" },
  { title: "Dropbox Backup", desc: "Schedule automated backups of all VMS data to Dropbox", status: "coming_soon" },
  { title: "S3 / Cloud Storage", desc: "Connect AWS S3 or compatible cloud storage for enterprise use", status: "coming_soon" },
];

const tabActiveClass = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground";

export default function StorageDashboard() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFiles = recentFiles.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.bucket.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Storage & Drive</h1>
          <p className="text-muted-foreground text-sm">Manage files, storage buckets, and cloud drive integrations</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Storage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10"><HardDrive className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Used</p>
                <p className="text-xl font-bold">{(totalUsed / 1000).toFixed(1)} GB</p>
              </div>
            </div>
            <Progress value={(totalUsed / totalCapacity) * 100} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{((totalUsed / totalCapacity) * 100).toFixed(1)}% of {totalCapacity / 1000} GB</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10"><FolderOpen className="w-5 h-5 text-blue-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Buckets</p>
                <p className="text-xl font-bold">{buckets.length}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{buckets.filter(b => b.isPublic).length} public, {buckets.filter(b => !b.isPublic).length} private</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10"><FileText className="w-5 h-5 text-emerald-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-xl font-bold">{buckets.reduce((s, b) => s + b.files, 0)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Across all storage buckets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10"><Cloud className="w-5 h-5 text-purple-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Cloud Drives</p>
                <p className="text-xl font-bold">0</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">No external drives connected</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="buckets">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="buckets" className={tabActiveClass}>Storage Buckets</TabsTrigger>
          <TabsTrigger value="files" className={tabActiveClass}>Recent Files</TabsTrigger>
          <TabsTrigger value="drive" className={tabActiveClass}>Drive Integration</TabsTrigger>
        </TabsList>

        {/* Buckets Tab */}
        <TabsContent value="buckets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buckets.map(bucket => (
              <Card key={bucket.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-accent`}>
                        <bucket.icon className={`w-5 h-5 ${bucket.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{bucket.name}</CardTitle>
                        <CardDescription className="text-xs">{bucket.id}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={bucket.isPublic ? "default" : "secondary"} className="text-[10px]">
                      {bucket.isPublic ? "Public" : "Private"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{bucket.files} files</span>
                    <span className="font-medium">{bucket.size}</span>
                  </div>
                  <Progress value={Math.min((bucket.used / (totalCapacity / buckets.length)) * 100, 100)} className="mt-2 h-1.5" />
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1 gap-1"><Upload className="w-3 h-3" />Upload</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1 gap-1"><Eye className="w-3 h-3" />Browse</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search files..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{file.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{file.bucket}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{file.type}</TableCell>
                    <TableCell>{file.size}</TableCell>
                    <TableCell className="text-muted-foreground">{file.uploaded}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Drive Integration Tab */}
        <TabsContent value="drive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cloud Drive Integrations</CardTitle>
              <CardDescription>Connect external cloud drives to centralize all your business files in one place</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {driveFeatures.map((feat, i) => (
                  <Card key={i} className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-accent"><Cloud className="w-5 h-5 text-muted-foreground" /></div>
                          <div>
                            <h4 className="font-medium text-sm">{feat.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{feat.desc}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">Coming Soon</Badge>
                      </div>
                      <Button variant="outline" size="sm" className="mt-4 w-full gap-2" disabled>
                        <ExternalLink className="w-3.5 h-3.5" /> Connect
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
