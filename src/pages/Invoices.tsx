import { useEffect, useState } from 'react';
import { invoicesDb } from '@/services/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await invoicesDb.getAll();
        if (mounted) setInvoices(data || []);
      } catch (e) {
        console.error('Failed to load invoices', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">All invoices and billing documents</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground">No invoices found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-sm text-muted-foreground">
                    <th className="p-2">#</th>
                    <th className="p-2">Invoice No</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Vendor</th>
                    <th className="p-2">Amount</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv.id} className="border-t">
                      <td className="p-2 text-sm align-top">{i + 1}</td>
                      <td className="p-2 text-sm">{inv.invoice_no || inv.reference || '-'}</td>
                      <td className="p-2 text-sm">{inv.invoice_date || '-'}</td>
                      <td className="p-2 text-sm">{inv.vendor_name || '-'}</td>
                      <td className="p-2 text-sm">₹{(inv.total_amount || 0).toLocaleString()}</td>
                      <td className="p-2 text-sm">{inv.status || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
