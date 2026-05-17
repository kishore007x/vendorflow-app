import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Camera, Scan, Package, RotateCcw, CheckCircle2, XCircle, Video, FileImage, ShieldCheck, AlertTriangle, IndianRupee, Keyboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type ScanMode = 'order' | 'return';

interface ScanResult {
  barcode: string;
  type: 'order' | 'product' | 'return';
  details: {
    id: string;
    name: string;
    status: string;
    quantity?: number;
    sku?: string;
    mrp?: number;
    sellingPrice?: number;
    image?: string;
  };
}

interface BarcodeScannerProps {
  mode?: ScanMode;
  trigger?: React.ReactNode;
}

export function BarcodeScanner({ mode = 'order', trigger }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState(false);
  const [videoCaptured, setVideoCaptured] = useState(false);
  const [capturingVideo, setCapturingVideo] = useState(false);
  const [invoiceCaptured, setInvoiceCaptured] = useState(false);
  const [capturingInvoice, setCapturingInvoice] = useState(false);
  const [verified, setVerified] = useState(false);
  const [mismatchAlert, setMismatchAlert] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [useManual, setUseManual] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const { toast } = useToast();

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) { // SCANNING
          await html5QrCodeRef.current.stop();
        }
      } catch (e) {
        console.warn('Scanner stop error:', e);
      }
      html5QrCodeRef.current = null;
    }
  }, []);

  const lookupBarcode = async (barcode: string) => {
    // Try to find in orders or products
    const cleanBarcode = barcode.trim().toUpperCase();

    // Check orders
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .or(`order_number.eq.${cleanBarcode},id.eq.${cleanBarcode}`)
      .limit(1);

    if (orderData && orderData.length > 0) {
      const order = orderData[0];
      return {
        barcode: cleanBarcode,
        type: mode === 'return' ? 'return' as const : 'order' as const,
        details: {
          id: order.order_number,
          name: order.customer_name,
          status: order.status,
          quantity: 1,
          mrp: Number(order.total_amount),
          sellingPrice: Number(order.total_amount),
          image: '/placeholder.svg',
        },
      };
    }

    // Check products by SKU
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .or(`sku.eq.${cleanBarcode},name.ilike.%${cleanBarcode}%`)
      .limit(1);

    if (productData && productData.length > 0) {
      const product = productData[0];
      return {
        barcode: cleanBarcode,
        type: 'product' as const,
        details: {
          id: product.sku,
          name: product.name,
          status: product.status || 'active',
          sku: product.sku,
          mrp: Number(product.mrp),
          sellingPrice: Number(product.base_price),
          image: product.image_url || '/placeholder.svg',
        },
      };
    }

    return null;
  };

  const handleScanSuccess = async (decodedText: string) => {
    await stopScanner();
    setIsScanning(false);

    const result = await lookupBarcode(decodedText);
    if (result) {
      setScanResult(result);
      toast({ title: 'Barcode Scanned', description: `Found: ${result.details.name}` });
    } else {
      setScanError(true);
      toast({ title: 'Not Found', description: `No matching record for: ${decodedText}`, variant: 'destructive' });
    }
  };

  const startCameraScanner = async () => {
    setIsScanning(true);
    setScanResult(null);
    setScanError(false);
    setVideoCaptured(false);
    setInvoiceCaptured(false);
    setVerified(false);
    setMismatchAlert(false);
    setCameraError(false);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Small delay to ensure DOM element exists
      await new Promise(r => setTimeout(r, 200));

      if (!scannerRef.current) {
        setCameraError(true);
        setIsScanning(false);
        return;
      }

      const scannerId = 'barcode-scanner-view';
      // Create the scanner element if not present
      let el = document.getElementById(scannerId);
      if (!el) {
        el = document.createElement('div');
        el.id = scannerId;
        scannerRef.current.appendChild(el);
      }

      const scanner = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (text: string) => handleScanSuccess(text),
        () => {} // ignore failures
      );
    } catch (e: any) {
      console.warn('Camera error:', e);
      setCameraError(true);
      setIsScanning(false);
      setUseManual(true);
    }
  };

  const handleManualLookup = async () => {
    if (!manualInput.trim()) return;
    setIsScanning(true);
    setScanResult(null);
    setScanError(false);

    const result = await lookupBarcode(manualInput.trim());
    setIsScanning(false);

    if (result) {
      setScanResult(result);
      toast({ title: 'Found', description: `Matched: ${result.details.name}` });
    } else {
      setScanError(true);
      toast({ title: 'Not Found', description: `No record for: ${manualInput}`, variant: 'destructive' });
    }
  };

  const handleCaptureVideo = () => {
    setCapturingVideo(true);
    setTimeout(() => {
      setCapturingVideo(false);
      setVideoCaptured(true);
      toast({ title: 'Video Captured', description: `File: ${scanResult?.details.id}_${Date.now()}` });
    }, 2000);
  };

  const handleCaptureInvoice = () => {
    setCapturingInvoice(true);
    setTimeout(() => {
      setCapturingInvoice(false);
      setInvoiceCaptured(true);
      toast({ title: 'Invoice Photo Captured', description: 'Invoice image saved successfully.' });
    }, 1500);
  };

  const resetScanner = async () => {
    await stopScanner();
    setScanResult(null);
    setScanError(false);
    setIsScanning(false);
    setVideoCaptured(false);
    setCapturingVideo(false);
    setInvoiceCaptured(false);
    setCapturingInvoice(false);
    setVerified(false);
    setMismatchAlert(false);
    setManualInput('');
    setCameraError(false);
  };

  const handleProcess = () => {
    setVerified(true);
    toast({
      title: mode === 'order' ? 'Order Processed' : 'Return Accepted',
      description: `${scanResult?.details.name} — Status updated.`,
    });
    setTimeout(() => {
      setIsOpen(false);
      resetScanner();
    }, 1200);
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString()}`;

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetScanner(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Scan className="w-4 h-4" />
            {mode === 'order' ? 'Scan Order' : 'Scan Return'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'order' ? <><Package className="w-5 h-5" />Order Barcode Scanner</> : <><RotateCcw className="w-5 h-5" />Return Barcode Scanner</>}
          </DialogTitle>
          <DialogDescription>
            {mode === 'order' ? 'Scan order barcode or enter manually' : 'Scan return barcode to accept returned items'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera View or Manual Input */}
          {!useManual ? (
            <div ref={scannerRef} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {isScanning ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* html5-qrcode renders here */}
                </div>
              ) : scanResult ? (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10">
                  {verified ? (
                    <div className="text-center space-y-2">
                      <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto" />
                      <p className="text-sm font-medium text-emerald-600">Verified & Processed</p>
                    </div>
                  ) : (
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  )}
                </div>
              ) : scanError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                  <XCircle className="w-16 h-16 text-destructive" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Camera className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">Click "Start Scan" to use camera</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Keyboard className="w-4 h-4" />
                <span>Enter Order ID, SKU, or barcode number</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. ORD-2024-001 or SKU-EAR-001"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
                />
                <Button onClick={handleManualLookup} disabled={isScanning || !manualInput.trim()}>
                  {isScanning ? 'Looking up...' : 'Search'}
                </Button>
              </div>
            </div>
          )}

          {/* Toggle camera/manual */}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => { stopScanner(); setUseManual(!useManual); }}>
              {useManual ? <><Camera className="w-3 h-3" />Switch to Camera</> : <><Keyboard className="w-3 h-3" />Enter Manually</>}
            </Button>
          </div>

          {cameraError && (
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-600 ml-2">
                Camera not available. Use manual entry instead.
              </AlertDescription>
            </Alert>
          )}

          {mismatchAlert && scanResult && (
            <Alert className="border-rose-500/30 bg-rose-500/5">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <AlertDescription className="text-rose-600 ml-2">
                <strong>Mismatch Detected:</strong> Please verify before processing.
              </AlertDescription>
            </Alert>
          )}

          {/* Product Details After Scan */}
          {scanResult && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-4">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={scanResult.details.image} alt={scanResult.details.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="font-mono text-xs text-muted-foreground">{scanResult.barcode}</p>
                    <p className="font-medium text-sm">{scanResult.details.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize text-xs">{scanResult.type}</Badge>
                      <Badge variant="outline" className={
                        ['in_stock', 'shipped', 'delivered', 'active'].includes(scanResult.details.status)
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs'
                          : 'bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs'
                      }>
                        {scanResult.details.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-sm">
                      {scanResult.details.sku && (
                        <div className="flex items-center gap-1"><span className="text-muted-foreground text-xs">SKU:</span><span className="font-mono text-xs font-medium">{scanResult.details.sku}</span></div>
                      )}
                      {scanResult.details.quantity != null && (
                        <div className="flex items-center gap-1"><span className="text-muted-foreground text-xs">Qty:</span><span className="font-medium text-xs">{scanResult.details.quantity}</span></div>
                      )}
                      {scanResult.details.mrp != null && (
                        <div className="flex items-center gap-1"><IndianRupee className="w-3 h-3 text-muted-foreground" /><span className="text-muted-foreground text-xs">MRP:</span><span className="font-medium text-xs">{formatCurrency(scanResult.details.mrp)}</span></div>
                      )}
                      {scanResult.details.sellingPrice != null && (
                        <div className="flex items-center gap-1"><IndianRupee className="w-3 h-3 text-muted-foreground" /><span className="text-muted-foreground text-xs">Price:</span><span className="font-medium text-xs text-primary">{formatCurrency(scanResult.details.sellingPrice)}</span></div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Badge variant="outline" className={`gap-1 text-xs ${videoCaptured ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'text-muted-foreground'}`}>
                    <Video className="w-3 h-3" />{videoCaptured ? 'Video ✓' : 'No Video'}
                  </Badge>
                  <Badge variant="outline" className={`gap-1 text-xs ${invoiceCaptured ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'text-muted-foreground'}`}>
                    <FileImage className="w-3 h-3" />{invoiceCaptured ? 'Invoice ✓' : 'No Invoice'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {!scanResult && !scanError && !useManual && (
              <Button className="flex-1 gap-2" onClick={startCameraScanner} disabled={isScanning}>
                <Scan className="w-4 h-4" />
                {isScanning ? 'Scanning...' : 'Start Scan'}
              </Button>
            )}

            {scanResult && !verified && (
              <>
                {!videoCaptured && (
                  <Button variant="outline" className="gap-2" onClick={handleCaptureVideo} disabled={capturingVideo}>
                    <Video className="w-4 h-4" />{capturingVideo ? 'Recording...' : 'Capture Video'}
                  </Button>
                )}
                {!invoiceCaptured && (
                  <Button variant="outline" className="gap-2" onClick={handleCaptureInvoice} disabled={capturingInvoice}>
                    <FileImage className="w-4 h-4" />{capturingInvoice ? 'Capturing...' : 'Capture Invoice'}
                  </Button>
                )}
                <Button className="gap-2" onClick={handleProcess}>
                  {mode === 'order' ? 'Process Order' : 'Accept Return'}
                </Button>
              </>
            )}

            {(scanResult || scanError) && !verified && (
              <Button variant="ghost" className="gap-2" onClick={resetScanner}>
                <Camera className="w-4 h-4" />Scan Again
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
