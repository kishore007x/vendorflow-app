#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIRSTCRY_DIR = path.resolve(__dirname, '../Firstcry');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
  console.error('Set them and re-run: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

function parseNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[,\s]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString();
  const s = String(v).trim();
  // ISO parse
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString();
  // dd/mm/yyyy or d/m/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(.*))?$/);
  if (m) {
    const day = Number(m[1]), month = Number(m[2]) - 1, year = Number(m[3]);
    const dt = new Date(year, month, day);
    if (!isNaN(dt)) return dt.toISOString();
  }
  return null;
}

async function insertBatch(table, rows) {
  if (!rows || rows.length === 0) return { count: 0 };
  // Supabase limits payload sizes; insert in chunks
  const chunkSize = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`Insert error into ${table}:`, error.message || error);
      return { count: inserted, error };
    }
    inserted += chunk.length;
    console.log(`Inserted ${inserted} rows into ${table}...`);
  }
  return { count: inserted };
}

function headerAllBlank(headers) {
  if (!headers) return true;
  return headers.every(h => h === null || h === undefined || String(h).trim() === '');
}

function normalizeKey(k) {
  if (!k) return k;
  return String(k).trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function rowToObject(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    const key = normalizeKey(headers[i] || `col${i+1}`);
    obj[key] = row[i] === undefined ? null : row[i];
  }
  return obj;
}

async function processFile(filePath) {
  const file = path.basename(filePath);
  console.log('\nProcessing', file);
  const wb = XLSX.readFile(filePath, { raw: false });
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (!rows || rows.length === 0) continue;
    const headers = rows[0].map(h => (h === null ? '' : String(h)));
    const allBlank = headerAllBlank(headers);
    const dataRows = rows.slice(1);

    if (file.toLowerCase().includes('dashboardsale') || sheetName.toLowerCase().includes('sales')) {
      const toInsert = dataRows.map(r => {
        const obj = rowToObject(headers, r);
        return {
          poid: obj.poid || obj.poid || obj['poid'] || obj['po id'] || obj['poid'],
          order_date: parseDate(obj.orderdate || obj.order_date || obj['orderdate']),
          product_id: parseNumber(obj.productid),
          brand_name: obj['brand name'] || obj.brand_name || obj.brand || null,
          business_type: obj['business type'] || obj.business_type || null,
          quantity: parseNumber(obj.quantity),
          mrp: parseNumber(obj.mrp),
          mrp_sales: parseNumber(obj['mrp sales'] || obj.mrp_sales),
          subcategory_name: obj.subcategoryname || obj.subcategory_name || null,
          category_name: obj.categoryname || obj.category_name || null,
          stock_type: obj.stocktype || obj.stock_type || null,
          vendor_style_code: obj.vendorstylecode || obj.vendor_style_code || null,
          source_file: file,
          sheet_name: sheetName
        };
      });
      await insertBatch('firstcry_sales', toInsert.filter(Boolean));
      continue;
    }

    if (file.toLowerCase().includes('gstreconciliation') || headers.map(h=>h.toLowerCase()).includes('vendor name')) {
      const toInsert = dataRows.map(r => {
        const obj = rowToObject(headers, r);
        return {
          vendor_name: obj.vendorname || obj['vendor name'] || null,
          state: obj.state || null,
          gstr_type: obj.gstrtype || obj['gstrtype'] || null,
          credit_type: obj.credittype || obj['credit type'] || null,
          financial_year: obj.finiancialyear || obj['finiancial year'] || null,
          transaction_month: obj.transactionmonth || obj['transaction month'] || null,
          return_frequency: obj.returnfrequency || obj['return frequency'] || null,
          gstin: obj.gstin || null,
          reference_id: obj.referenceid || obj['reference id'] || null,
          invoice_no: obj.invoiceno || obj['invoice no'] || null,
          invoice_date: parseDate(obj.invoicedate || obj['invoice date']),
          cgst: parseNumber(obj.cgst),
          sgst: parseNumber(obj.sgst),
          igst: parseNumber(obj.igst),
          gst_type: obj.gsttype || obj['gst type'] || null,
          total_tax: parseNumber(obj['total tax'] || obj.totaltax),
          created_by: obj['created by'] || obj.createdby || null,
          status: obj.status || null,
          exp_id: obj['exp id'] || obj.exp_id || null,
          source_file: file,
          sheet_name: sheetName
        };
      });
      await insertBatch('firstcry_gst_reconciliation', toInsert.filter(Boolean));
      continue;
    }

    if (file.toLowerCase().includes('productwisebox') || headers.map(h=>h.toLowerCase()).includes('srno')) {
      const toInsert = dataRows.map(r => {
        const obj = rowToObject(headers, r);
        return {
          sr_no: parseNumber(obj.srno || obj['sr no'] || obj['sr_no']),
          product_id: parseNumber(obj.productid),
          vendor_style_code: obj.vendorstylecode || null,
          product_name: obj.productname || null,
          packaging_id: parseNumber(obj.packagingid),
          length_cm: parseNumber(obj['length(cm)'] || obj.length_cm),
          breadth_cm: parseNumber(obj['breadth(cm)'] || obj.breadth_cm),
          height_cm: parseNumber(obj['height(cm)'] || obj.height_cm),
          weight_kg: parseNumber(obj['weight(kg)'] || obj.weight_kg),
          multiple_packaging_required: obj['multiple packaging required(e.g 123,234)'] || null,
          source_file: file,
          sheet_name: sheetName
        };
      });
      await insertBatch('firstcry_product_box_details', toInsert.filter(Boolean));
      continue;
    }

    if (file.toLowerCase().includes('salereturn') || sheetName.toLowerCase().includes('saleretur')) {
      const toInsert = dataRows.map(r => {
        const obj = rowToObject(headers, r);
        return {
          sr_no: parseNumber(obj['sr no'] || obj['sr_no'] || obj['sr no']),
          order_date: parseDate(obj['order date'] || obj.orderdate),
          sales_return_date: parseDate(obj['sales return date'] || obj.salesreturndate),
          poid: obj.poid || null,
          product_id: parseNumber(obj.productid),
          product_name: obj['product name'] || obj.productname || null,
          brand_names: obj['brand names'] || obj.brandnames || null,
          mrp: parseNumber(obj.mrp),
          ordered_quantity: parseNumber(obj['ordered quantity'] || obj.orderedquantity),
          quantity: parseNumber(obj.quantity),
          rpid_awb: obj['rpid/awb'] || obj.rpid_awb || null,
          reason: obj.reason || null,
          subtype_reason: obj['subtype reason'] || obj.subtypereason || null,
          subreason: obj.subreason || null,
          vendor_style_code: obj.vendorstylecode || null,
          source_file: file,
          sheet_name: sheetName
        };
      });
      await insertBatch('firstcry_sale_returns', toInsert.filter(Boolean));
      continue;
    }

    if (file.toLowerCase().includes('vendorinvoice') || sheetName.toLowerCase().includes('vendorinvoice')) {
      const toInsert = dataRows.map(r => {
        const obj = rowToObject(headers, r);
        return {
          fc_reference_no: obj['fc reference no'] || obj.fcreferenceno || null,
          invoice_no: obj['invoice no'] || obj.invoiceno || null,
          invoice_date: parseDate(obj['invoice date'] || obj.invoicedate),
          stock_type: obj['stock type'] || null,
          site_type: obj['site type'] || null,
          invoice_status: obj['invoice status'] || null,
          vendor_name: obj['vendor name'] || null,
          vendor_gst_no: obj['vendor gst no'] || null,
          invoice_quantity: parseNumber(obj['invoice quantity']),
          gross_amount: parseNumber(obj['gross amount']),
          tax_amount: parseNumber(obj['tax amount']),
          net_amount: parseNumber(obj['net amount']),
          reject_reason: obj['reject reason'] || null,
          company_name: obj['company name'] || null,
          source_file: file,
          sheet_name: sheetName
        };
      });
      await insertBatch('firstcry_vendor_invoices', toInsert.filter(Boolean));
      continue;
    }

    if (file.toLowerCase().includes('vendorreconciliation') || sheetName.toLowerCase().includes('exportvendorreconciliation')) {
      const toInsert = dataRows.map(r => {
        const obj = rowToObject(headers, r);
        return {
          sr_no: parseNumber(obj['srno'] || obj.sr_no || obj['sr no']),
          fc_ref_no: obj['fc ref no'] || obj['fc_ref_no'] || obj['fc ref. no.'] || null,
          order_ids: obj['order ids'] || obj.orderids || null,
          order_date: parseDate(obj['order date'] || obj.orderdate),
          shipping_date: parseDate(obj['shipping date'] || obj.shippingdate),
          delivery_date: parseDate(obj['delivery date'] || obj.deliverydate),
          sr_rto_date: parseDate(obj['sr/rto date'] || obj['sr_rto_date']),
          product_id: parseNumber(obj['product id'] || obj.productid),
          hsn_code: obj['hsn code'] || null,
          qty: parseNumber(obj.qty),
          mrp: parseNumber(obj.mrp),
          base_cost: parseNumber(obj['base cost'] || obj.basecost),
          gross_amount: parseNumber(obj['gross amount'] || obj.grossamount),
          cgst_percent: parseNumber(obj['cgst %'] || obj.cgstpercent),
          cgst_amount: parseNumber(obj['cgst amount'] || obj.cgstamount),
          sgst_percent: parseNumber(obj['sgst %'] || obj.sgstpercent),
          sgst_amount: parseNumber(obj['sgst amount'] || obj.sgstamount),
          total: parseNumber(obj.total),
          vendor_invoice_no: obj['vendor invoice no'] || null,
          payment_advice_no: obj['payment advice no'] || null,
          debit_note_no: obj['debit note no'] || null,
          whpoid: obj.whpoid || null,
          vendor_style_code: obj.vendorstylecode || null,
          awb_no: obj.awbno || null,
          sr_qty: parseNumber(obj['sr qty'] || obj.sr_qty),
          sr_total_amount: parseNumber(obj['sr total amount'] || obj.sr_total_amount),
          sr_gross_amount: parseNumber(obj['sr gross amount'] || obj.sr_gross_amount),
          rto_qty: parseNumber(obj['rto qty'] || obj.rto_qty),
          rto_total_amount: parseNumber(obj['rto total amount'] || obj.rto_total_amount),
          rto_gross_amount: parseNumber(obj['rto gross amount'] || obj.rto_gross_amount),
          source_file: file,
          sheet_name: sheetName
        };
      });
      await insertBatch('firstcry_vendor_reconciliation', toInsert.filter(Boolean));
      continue;
    }

    // Payment advice - often has blank headers; try to find TDS Amount cell
    if (file.toLowerCase().includes('explortpaymentadvicedata') || sheetName.toLowerCase().includes('exportpaymentadvisordetails')) {
      const toInsert = dataRows.map(r => {
        const obj = rowToObject(headers, r);
        const tds = parseNumber(obj['tds amount'] || obj.tds_amount || obj['tds']);
        return {
          tds_amount: tds,
          other_columns: JSON.stringify(obj),
          source_file: file,
          sheet_name: sheetName
        };
      });
      await insertBatch('firstcry_payment_advice', toInsert.filter(Boolean));
      continue;
    }

    // Pre/Post delivery documents: store as debit_notes with some parsing
    if (/^post\d+/i.test(file) || /^pre\d+/i.test(file) || sheetName.toLowerCase().includes('delivery debit') || sheetName.toLowerCase().includes('pre delivery')) {
      // Attempt to extract BatchID and Generation Date from first few rows
      const flat = dataRows.flat().join(' | ');
      const batchMatch = flat.match(/batchid\W*([A-Z0-9_\-]+)/i);
      const dateMatch = flat.match(/generation date[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4}|[0-9]{4}[-][0-9]{2}[-][0-9]{2})/i);
      const note_type = file.toLowerCase().startsWith('post') ? 'post' : (file.toLowerCase().startsWith('pre') ? 'pre' : 'document');
      const rec = {
        note_type,
        company: null,
        batch_id: batchMatch ? batchMatch[1] : null,
        generation_date: dateMatch ? parseDate(dateMatch[1]) : null,
        raw_text: flat,
        source_file: file,
        sheet_name: sheetName
      };
      await insertBatch('firstcry_debit_notes', [rec]);
      continue;
    }

    // Fallback: store row-level raw JSON
    const rawInserts = dataRows.map((r, idx) => ({
      filename: file,
      sheet_name: sheetName,
      row_index: idx + 2,
      row_data: rowToObject(headers, r),
      source_file: file
    }));
    await insertBatch('firstcry_raw_files', rawInserts);
  }
}

async function main() {
  const files = fs.readdirSync(FIRSTCRY_DIR).filter(f => /\.xlsx$|\.xls$|\.csv$/i.test(f));
  console.log('Found', files.length, 'files in', FIRSTCRY_DIR);
  for (const f of files) {
    try {
      await processFile(path.join(FIRSTCRY_DIR, f));
    } catch (err) {
      console.error('Failed processing', f, err && err.message ? err.message : err);
    }
  }
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
