import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Products from './Products';
import CatalogManager from './CatalogManager';

export default function ProductsCatalog() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Products & Catalog</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your product listings and catalog operations in one place.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass-panel">
          <TabsTrigger value="products">Products List</TabsTrigger>
          <TabsTrigger value="catalog">Catalog Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <Products />
        </TabsContent>

        <TabsContent value="catalog" className="mt-4">
          <CatalogManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
