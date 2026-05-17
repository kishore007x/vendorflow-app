import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, IndianRupee, TrendingUp, TrendingDown, Percent, Truck, Tag, Megaphone, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { getChannels } from '@/services/channelManager';
import { ChannelIcon } from '@/components/ChannelIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Default marketplace fee structures
const DEFAULT_FEE_STRUCTURES: Record<string, MarketplaceFees> = {
  amazon: {
    commissionPercent: 15,
    closingFee: 25,
    shippingFee: 65,
    pickAndPackFee: 14,
    weightHandlingFee: 35,
    gstOnFees: 18,
    tcsPercent: 1,
    fixedFee: 0,
  },
  flipkart: {
    commissionPercent: 12,
    closingFee: 20,
    shippingFee: 55,
    pickAndPackFee: 12,
    weightHandlingFee: 30,
    gstOnFees: 18,
    tcsPercent: 1,
    fixedFee: 0,
  },
  meesho: {
    commissionPercent: 0,
    closingFee: 0,
    shippingFee: 50,
    pickAndPackFee: 0,
    weightHandlingFee: 26,
    gstOnFees: 18,
    tcsPercent: 1,
    fixedFee: 0,
  },
  blinkit: {
    commissionPercent: 20,
    closingFee: 0,
    shippingFee: 0,
    pickAndPackFee: 0,
    weightHandlingFee: 0,
    gstOnFees: 18,
    tcsPercent: 1,
    fixedFee: 10,
  },
  myntra: {
    commissionPercent: 18,
    closingFee: 20,
    shippingFee: 60,
    pickAndPackFee: 15,
    weightHandlingFee: 32,
    gstOnFees: 18,
    tcsPercent: 1,
    fixedFee: 0,
  },
  nykaa: {
    commissionPercent: 25,
    closingFee: 15,
    shippingFee: 50,
    pickAndPackFee: 10,
    weightHandlingFee: 28,
    gstOnFees: 18,
    tcsPercent: 1,
    fixedFee: 0,
  },
  ajio: {
    commissionPercent: 16,
    closingFee: 18,
    shippingFee: 55,
    pickAndPackFee: 12,
    weightHandlingFee: 30,
    gstOnFees: 18,
    tcsPercent: 1,
    fixedFee: 0,
  },
};

interface MarketplaceFees {
  commissionPercent: number;
  closingFee: number;
  shippingFee: number;
  pickAndPackFee: number;
  weightHandlingFee: number;
  gstOnFees: number;
  tcsPercent: number;
  fixedFee: number;
}

interface ProductInput {
  sellingPrice: string;
  costPrice: string;
  gstPercent: string;
  weight: string;
  adSpend: string;
  adOrders: string;
  packagingCost: string;
  returnPercent: string;
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-muted-foreground inline ml-1 cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[200px] text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function calculateProfit(input: ProductInput, fees: MarketplaceFees) {
  const sp = Number(input.sellingPrice) || 0;
  const cp = Number(input.costPrice) || 0;
  const gst = Number(input.gstPercent) || 0;
  const weight = Number(input.weight) || 0.5;
  const adSpend = Number(input.adSpend) || 0;
  const adOrders = Number(input.adOrders) || 1;
  const packagingCost = Number(input.packagingCost) || 0;
  const returnPct = Number(input.returnPercent) || 0;

  // Commission
  const commission = sp * (fees.commissionPercent / 100);
  
  // Closing fee
  const closingFee = fees.closingFee;
  
  // Shipping & handling
  const weightMultiplier = Math.max(1, Math.ceil(weight / 0.5));
  const shippingFee = fees.shippingFee + (fees.weightHandlingFee * weightMultiplier);
  const pickPack = fees.pickAndPackFee;
  
  // Fixed fee (blinkit-style)
  const fixedFee = fees.fixedFee;
  
  // Total marketplace fees before GST
  const totalFees = commission + closingFee + shippingFee + pickPack + fixedFee;
  
  // GST on marketplace fees
  const gstOnFees = totalFees * (fees.gstOnFees / 100);
  
  // TCS
  const tcs = sp * (fees.tcsPercent / 100);
  
  // Total deductions from marketplace
  const totalMarketplaceDeductions = totalFees + gstOnFees + tcs;
  
  // Net settlement from marketplace
  const netSettlement = sp - totalMarketplaceDeductions;
  
  // Ad cost per order
  const adCostPerOrder = adOrders > 0 ? adSpend / adOrders : 0;
  
  // Return cost (avg per order)
  const returnCost = sp * (returnPct / 100) * 0.5; // ~50% loss on returns
  
  // GST payable on selling price
  const gstOnSP = sp * (gst / (100 + gst)); // GST included in SP
  
  // Input credit (on cost price)
  const gstInputCredit = cp * (gst / 100);
  
  // Net GST liability
  const netGSTLiability = Math.max(0, gstOnSP - gstInputCredit);
  
  // Total cost
  const totalCost = cp + packagingCost + adCostPerOrder + returnCost + netGSTLiability;
  
  // Profit
  const netProfit = netSettlement - totalCost;
  const margin = sp > 0 ? (netProfit / sp) * 100 : 0;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  
  return {
    sellingPrice: sp,
    costPrice: cp,
    commission,
    closingFee,
    shippingFee,
    pickPack,
    fixedFee,
    gstOnFees,
    tcs,
    totalMarketplaceDeductions,
    netSettlement,
    adCostPerOrder,
    returnCost,
    packagingCost,
    netGSTLiability,
    totalCost,
    netProfit,
    margin,
    roi,
  };
}

export default function ProfitCalculator() {
  const channels = getChannels();
  const [selectedPortal, setSelectedPortal] = useState('amazon');
  const [input, setInput] = useState<ProductInput>({
    sellingPrice: '999',
    costPrice: '400',
    gstPercent: '18',
    weight: '0.5',
    adSpend: '500',
    adOrders: '10',
    packagingCost: '15',
    returnPercent: '5',
  });

  const [customFees, setCustomFees] = useState<Record<string, MarketplaceFees>>({});

  const getFees = (portal: string): MarketplaceFees => {
    return customFees[portal] || DEFAULT_FEE_STRUCTURES[portal] || DEFAULT_FEE_STRUCTURES.amazon;
  };

  const updateInput = (key: keyof ProductInput, value: string) => {
    setInput(prev => ({ ...prev, [key]: value }));
  };

  const result = useMemo(() => calculateProfit(input, getFees(selectedPortal)), [input, selectedPortal, customFees]);

  // Comparison across all portals
  const allResults = useMemo(() => {
    return channels.map(ch => ({
      portal: ch,
      result: calculateProfit(input, getFees(ch.id as string)),
    }));
  }, [input, channels, customFees]);

  const selectedChannel = channels.find(c => c.id === selectedPortal);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            Marketplace Profit Calculator
          </h1>
          <p className="text-muted-foreground">Calculate net profit per unit across marketplaces with full cost breakdown</p>
        </div>
        <Badge variant="outline" className="gap-1 text-sm w-fit">
          <IndianRupee className="w-3.5 h-3.5" /> INR
        </Badge>
      </div>

      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calculator">Single Calculator</TabsTrigger>
          <TabsTrigger value="comparison">All Portals Comparison</TabsTrigger>
          <TabsTrigger value="fees">Fee Configuration</TabsTrigger>
        </TabsList>

        {/* SINGLE CALCULATOR */}
        <TabsContent value="calculator">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Input Panel */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Product Details</CardTitle>
                <CardDescription>Enter your product costs and selling details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Marketplace</Label>
                  <Select value={selectedPortal} onValueChange={setSelectedPortal}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {channels.map(ch => (
                        <SelectItem key={ch.id} value={ch.id as string}>
                          <ChannelIcon channelId={ch.id} fallbackIcon={ch.icon} size={16} /> {ch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Selling Price (₹) <InfoTip text="MRP or listing price on marketplace" /></Label>
                    <Input type="number" value={input.sellingPrice} onChange={e => updateInput('sellingPrice', e.target.value)} />
                  </div>
                  <div>
                    <Label>Cost Price (₹) <InfoTip text="Your procurement / manufacturing cost" /></Label>
                    <Input type="number" value={input.costPrice} onChange={e => updateInput('costPrice', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>GST % <InfoTip text="GST rate applicable on your product" /></Label>
                    <Input type="number" value={input.gstPercent} onChange={e => updateInput('gstPercent', e.target.value)} />
                  </div>
                  <div>
                    <Label>Weight (kg) <InfoTip text="Shipping weight affects handling fees" /></Label>
                    <Input type="number" step="0.1" value={input.weight} onChange={e => updateInput('weight', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ad Spend (₹) <InfoTip text="Total advertising spend for this product" /></Label>
                    <Input type="number" value={input.adSpend} onChange={e => updateInput('adSpend', e.target.value)} />
                  </div>
                  <div>
                    <Label>Orders from Ads <InfoTip text="Number of orders generated from ads" /></Label>
                    <Input type="number" value={input.adOrders} onChange={e => updateInput('adOrders', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Packaging (₹) <InfoTip text="Cost of packaging per unit" /></Label>
                    <Input type="number" value={input.packagingCost} onChange={e => updateInput('packagingCost', e.target.value)} />
                  </div>
                  <div>
                    <Label>Return % <InfoTip text="Average return rate for this product" /></Label>
                    <Input type="number" value={input.returnPercent} onChange={e => updateInput('returnPercent', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Panel */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ChannelIcon channelId={selectedChannel?.id || ""} fallbackIcon={selectedChannel?.icon} size={20} /> {selectedChannel?.name} Breakdown
                    </CardTitle>
                    <CardDescription>Per unit profitability analysis</CardDescription>
                  </div>
                  <div className={`text-2xl font-bold ${result.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                    ₹{result.netProfit.toFixed(2)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Profit Summary Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Net Margin</div>
                    <div className={`text-lg font-bold ${result.margin >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      {result.margin.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground mb-1">ROI</div>
                    <div className={`text-lg font-bold ${result.roi >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      {result.roi.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Settlement</div>
                    <div className="text-lg font-bold text-foreground">₹{result.netSettlement.toFixed(0)}</div>
                  </div>
                </div>

                {/* Detailed Breakdown Table */}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Component</TableHead>
                      <TableHead className="text-right font-semibold">Amount (₹)</TableHead>
                      <TableHead className="text-right font-semibold">% of SP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-primary/5">
                      <TableCell className="font-medium"><Tag className="w-3.5 h-3.5 inline mr-1.5" />Selling Price</TableCell>
                      <TableCell className="text-right font-semibold">{result.sellingPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                    
                    <TableRow><TableCell colSpan={3} className="text-xs font-semibold text-muted-foreground pt-3 pb-1 bg-muted/20">MARKETPLACE FEES</TableCell></TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-sm"><Percent className="w-3 h-3 inline mr-1.5" />Commission ({getFees(selectedPortal).commissionPercent}%)</TableCell>
                      <TableCell className="text-right text-destructive">-{result.commission.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{((result.commission / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-sm">Closing Fee</TableCell>
                      <TableCell className="text-right text-destructive">-{result.closingFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{((result.closingFee / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-sm"><Truck className="w-3 h-3 inline mr-1.5" />Shipping + Weight Handling</TableCell>
                      <TableCell className="text-right text-destructive">-{result.shippingFee.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{((result.shippingFee / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    {result.pickPack > 0 && (
                      <TableRow>
                        <TableCell className="pl-6 text-sm">Pick & Pack</TableCell>
                        <TableCell className="text-right text-destructive">-{result.pickPack.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{((result.pickPack / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    )}
                    {result.fixedFee > 0 && (
                      <TableRow>
                        <TableCell className="pl-6 text-sm">Fixed Fee</TableCell>
                        <TableCell className="text-right text-destructive">-{result.fixedFee.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{((result.fixedFee / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="pl-6 text-sm">GST on Fees (18%)</TableCell>
                      <TableCell className="text-right text-destructive">-{result.gstOnFees.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{((result.gstOnFees / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-sm">TCS ({getFees(selectedPortal).tcsPercent}%)</TableCell>
                      <TableCell className="text-right text-destructive">-{result.tcs.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{((result.tcs / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-semibold">Total Marketplace Deductions</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">-{result.totalMarketplaceDeductions.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">{((result.totalMarketplaceDeductions / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow className="bg-accent/30">
                      <TableCell className="font-semibold">Net Settlement</TableCell>
                      <TableCell className="text-right font-semibold">{result.netSettlement.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{((result.netSettlement / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>

                    <TableRow><TableCell colSpan={3} className="text-xs font-semibold text-muted-foreground pt-3 pb-1 bg-muted/20">YOUR COSTS</TableCell></TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-sm">Cost Price</TableCell>
                      <TableCell className="text-right text-destructive">-{result.costPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{((result.costPrice / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-sm">Packaging</TableCell>
                      <TableCell className="text-right text-destructive">-{result.packagingCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{((result.packagingCost / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-sm"><Megaphone className="w-3 h-3 inline mr-1.5" />Ad Cost / Order</TableCell>
                      <TableCell className="text-right text-destructive">-{result.adCostPerOrder.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{((result.adCostPerOrder / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-sm">Return Cost (avg)</TableCell>
                      <TableCell className="text-right text-destructive">-{result.returnCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{((result.returnCost / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-sm">Net GST Liability</TableCell>
                      <TableCell className="text-right text-destructive">-{result.netGSTLiability.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{((result.netGSTLiability / result.sellingPrice) * 100).toFixed(1)}%</TableCell>
                    </TableRow>

                    <TableRow className={`border-t-2 ${result.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                      <TableCell className="font-bold text-base">
                        {result.netProfit >= 0 ? <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 inline mr-1.5 text-destructive" />}
                        NET PROFIT
                      </TableCell>
                      <TableCell className={`text-right font-bold text-base ${result.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                        ₹{result.netProfit.toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${result.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                        {result.margin.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ALL PORTALS COMPARISON */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cross-Platform Profit Comparison</CardTitle>
              <CardDescription>Same product, different marketplace payouts — using your current input values</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Portal</TableHead>
                    <TableHead className="text-right font-semibold">Commission</TableHead>
                    <TableHead className="text-right font-semibold">Shipping</TableHead>
                    <TableHead className="text-right font-semibold">Total Fees</TableHead>
                    <TableHead className="text-right font-semibold">Settlement</TableHead>
                    <TableHead className="text-right font-semibold">Net Profit</TableHead>
                    <TableHead className="text-right font-semibold">Margin</TableHead>
                    <TableHead className="text-center font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allResults
                    .sort((a, b) => b.result.netProfit - a.result.netProfit)
                    .map(({ portal, result: r }) => (
                    <TableRow key={portal.id} className={r.netProfit >= 0 ? '' : 'bg-destructive/5'}>
                      <TableCell className="font-medium">
                        <ChannelIcon channelId={portal.id} fallbackIcon={portal.icon} size={16} />
                        {portal.name}
                      </TableCell>
                      <TableCell className="text-right text-sm">₹{r.commission.toFixed(0)}</TableCell>
                      <TableCell className="text-right text-sm">₹{r.shippingFee.toFixed(0)}</TableCell>
                      <TableCell className="text-right text-sm text-destructive">₹{r.totalMarketplaceDeductions.toFixed(0)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">₹{r.netSettlement.toFixed(0)}</TableCell>
                      <TableCell className={`text-right font-bold ${r.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                        ₹{r.netProfit.toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={r.margin >= 15 ? 'default' : r.margin >= 0 ? 'secondary' : 'destructive'} className="text-xs">
                          {r.margin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.netProfit >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500 inline" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive inline" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Best portal highlight */}
              {allResults.length > 0 && (() => {
                const best = allResults.reduce((a, b) => a.result.netProfit > b.result.netProfit ? a : b);
                return (
                  <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Best Platform: <span className="font-bold inline-flex items-center gap-1"><ChannelIcon channelId={best.portal.id} fallbackIcon={best.portal.icon} size={16} /> {best.portal.name}</span> — ₹{best.result.netProfit.toFixed(2)} profit ({best.result.margin.toFixed(1)}% margin)
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEE CONFIGURATION */}
        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Marketplace Fee Configuration</CardTitle>
                  <CardDescription>Customize fee structures per marketplace — defaults are pre-filled with approximate rates</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setCustomFees({}); }}>
                  Reset to Defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Portal</TableHead>
                      <TableHead className="text-center font-semibold">Commission %</TableHead>
                      <TableHead className="text-center font-semibold">Closing Fee</TableHead>
                      <TableHead className="text-center font-semibold">Shipping</TableHead>
                      <TableHead className="text-center font-semibold">Pick & Pack</TableHead>
                      <TableHead className="text-center font-semibold">Weight Fee</TableHead>
                      <TableHead className="text-center font-semibold">GST on Fees %</TableHead>
                      <TableHead className="text-center font-semibold">TCS %</TableHead>
                      <TableHead className="text-center font-semibold">Fixed Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels.map(ch => {
                      const fees = getFees(ch.id as string);
                      const updateFee = (key: keyof MarketplaceFees, value: string) => {
                        setCustomFees(prev => ({
                          ...prev,
                          [ch.id]: { ...fees, [key]: Number(value) || 0 },
                        }));
                      };
                      return (
                        <TableRow key={ch.id}>
                          <TableCell className="font-medium whitespace-nowrap"><ChannelIcon channelId={ch.id} fallbackIcon={ch.icon} size={16} /> {ch.name}</TableCell>
                          <TableCell><Input type="number" className="w-20 mx-auto text-center h-8 text-sm" value={fees.commissionPercent} onChange={e => updateFee('commissionPercent', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" className="w-20 mx-auto text-center h-8 text-sm" value={fees.closingFee} onChange={e => updateFee('closingFee', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" className="w-20 mx-auto text-center h-8 text-sm" value={fees.shippingFee} onChange={e => updateFee('shippingFee', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" className="w-20 mx-auto text-center h-8 text-sm" value={fees.pickAndPackFee} onChange={e => updateFee('pickAndPackFee', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" className="w-20 mx-auto text-center h-8 text-sm" value={fees.weightHandlingFee} onChange={e => updateFee('weightHandlingFee', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" className="w-20 mx-auto text-center h-8 text-sm" value={fees.gstOnFees} onChange={e => updateFee('gstOnFees', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" className="w-20 mx-auto text-center h-8 text-sm" value={fees.tcsPercent} onChange={e => updateFee('tcsPercent', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" className="w-20 mx-auto text-center h-8 text-sm" value={fees.fixedFee} onChange={e => updateFee('fixedFee', e.target.value)} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
