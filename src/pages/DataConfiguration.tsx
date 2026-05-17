import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Database, Shield } from 'lucide-react';

interface FieldConfig {
  field: string;
  module: string;
  mandatory: boolean;
}

const initialFields: FieldConfig[] = [
  { field: 'SKU ID', module: 'Inventory / Orders', mandatory: true },
  { field: 'Master SKU ID', module: 'SKU Mapping', mandatory: true },
  { field: 'Product Name', module: 'Products', mandatory: true },
  { field: 'Brand', module: 'Products / Inventory', mandatory: true },
  { field: 'Category', module: 'Products', mandatory: true },
  { field: 'Base Price', module: 'Products', mandatory: true },
  { field: 'Portal', module: 'All Modules', mandatory: true },
  { field: 'Warehouse', module: 'Inventory', mandatory: true },
  { field: 'Barcode', module: 'Consolidated Orders', mandatory: false },
  { field: 'Video URL', module: 'Products', mandatory: false },
  { field: 'Tracking Number', module: 'Orders / Returns', mandatory: false },
  { field: 'Description', module: 'Products', mandatory: false },
  { field: 'Image URL', module: 'Products', mandatory: false },
  { field: 'Customer Email', module: 'Orders', mandatory: false },
  { field: 'Batch ID', module: 'Settlements', mandatory: false },
];

export default function DataConfiguration() {
  const [fields, setFields] = useState(initialFields);

  const toggleMandatory = (index: number) => {
    setFields(prev => prev.map((f, i) => i === index ? { ...f, mandatory: !f.mandatory } : f));
  };

  const mandatoryCount = fields.filter(f => f.mandatory).length;
  const optionalCount = fields.filter(f => !f.mandatory).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Configuration</h1>
          <p className="text-muted-foreground">Define mandatory and optional fields across modules for data governance</p>
        </div>
        <Badge variant="outline" className="gap-1 text-sm">
          <Shield className="w-3.5 h-3.5" />
          Data Governance
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fields.length}</p>
                <p className="text-sm text-muted-foreground">Total Fields</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mandatoryCount}</p>
                <p className="text-sm text-muted-foreground">Mandatory</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{optionalCount}</p>
                <p className="text-sm text-muted-foreground">Optional</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Field Configuration</CardTitle>
          <CardDescription>Toggle mandatory/optional status for each data field</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Field Name</TableHead>
                <TableHead className="font-semibold">Module</TableHead>
                <TableHead className="font-semibold text-center">Mandatory</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.field}>
                  <TableCell className="font-medium">{field.field}</TableCell>
                  <TableCell className="text-muted-foreground">{field.module}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={field.mandatory} onCheckedChange={() => toggleMandatory(index)} />
                  </TableCell>
                  <TableCell className="text-center">
                    {field.mandatory ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Required</Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
