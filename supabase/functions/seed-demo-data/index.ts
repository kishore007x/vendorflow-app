import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const portals = ['amazon', 'flipkart', 'meesho', 'firstcry', 'blinkit'];
const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const;
const brands = ['BabyJoy', 'KidWear', 'TinyTots', 'ComfyKids', 'PlayZone'];
const categories = ['Clothing', 'Toys', 'Accessories', 'Footwear', 'Care'];
const productNames = [
  'Cotton Romper Set', 'Printed T-Shirt Pack', 'Denim Dungaree', 'Winter Jacket',
  'Soft Toy Bear', 'Building Blocks Set', 'Hair Clips Assorted', 'Baby Shoes',
  'Organic Baby Lotion', 'Feeding Bottle Set', 'Diaper Bag', 'Blanket Set',
];
const customerNames = [
  'Priya Sharma', 'Rahul Verma', 'Anita Gupta', 'Suresh Kumar', 'Deepa Patel',
  'Vikram Singh', 'Meena Joshi', 'Amit Reddy', 'Kavita Das', 'Rajan Nair',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const userId = user.id;

    // Check if user already has data
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('vendor_id', userId);
    if (count && count > 0) {
      return new Response(JSON.stringify({ message: "Demo data already exists", seeded: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Seed Products (12)
    const products = productNames.map((name, i) => ({
      vendor_id: userId,
      created_by: userId,
      name,
      sku: `SKU-${String(i + 1).padStart(3, '0')}`,
      brand: brands[i % brands.length],
      category: categories[i % categories.length],
      mrp: 500 + Math.floor(Math.random() * 2000),
      base_price: 300 + Math.floor(Math.random() * 1500),
      gst_percent: [5, 12, 18][i % 3],
      hsn_code: `${6100 + i}`,
      status: 'active',
      portals_enabled: portals.slice(0, 2 + (i % 3)),
    }));
    const { data: insertedProducts } = await supabase.from('products').insert(products).select();

    // 2. Seed Inventory (12 items)
    if (insertedProducts) {
      const inventory = insertedProducts.map((p: any) => ({
        vendor_id: userId,
        sku_id: p.sku,
        product_name: p.name,
        master_quantity: 50 + Math.floor(Math.random() * 200),
        available_quantity: 20 + Math.floor(Math.random() * 150),
        reserved_quantity: Math.floor(Math.random() * 20),
        low_stock_threshold: 10 + Math.floor(Math.random() * 10),
        warehouse: ['Mumbai WH', 'Delhi WH', 'Bangalore WH'][Math.floor(Math.random() * 3)],
        portal: randomItem(portals),
        brand: p.brand,
      }));
      await supabase.from('inventory').insert(inventory);
    }

    // 3. Seed Orders (25)
    const orderInserts = Array.from({ length: 25 }, (_, i) => {
      const portal = randomItem(portals);
      const status = randomItem(statuses);
      const orderDate = randomDate(30);
      return {
        vendor_id: userId,
        created_by: userId,
        order_number: `ORD-${Date.now().toString(36).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
        portal,
        status,
        customer_name: randomItem(customerNames),
        customer_email: `customer${i + 1}@example.com`,
        customer_phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        customer_city: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'][i % 5],
        customer_state: ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana'][i % 5],
        customer_pincode: `${400000 + Math.floor(Math.random() * 200000)}`,
        total_amount: 500 + Math.floor(Math.random() * 5000),
        commission: Math.floor(Math.random() * 300),
        shipping_fee: [0, 50, 80, 100][Math.floor(Math.random() * 4)],
        order_date: orderDate,
        shipped_date: status === 'shipped' || status === 'delivered' ? randomDate(15) : null,
        delivered_date: status === 'delivered' ? randomDate(7) : null,
      };
    });
    const { data: insertedOrders } = await supabase.from('orders').insert(orderInserts).select();

    // 4. Seed Order Items
    if (insertedOrders && insertedProducts) {
      const orderItems = insertedOrders.map((o: any) => ({
        order_id: o.id,
        product_id: randomItem(insertedProducts).id,
        product_name: randomItem(productNames),
        sku: `SKU-${String(Math.floor(Math.random() * 12) + 1).padStart(3, '0')}`,
        quantity: 1 + Math.floor(Math.random() * 3),
        unit_price: 300 + Math.floor(Math.random() * 1500),
        total: o.total_amount,
      }));
      await supabase.from('order_items').insert(orderItems);
    }

    // 5. Seed Returns (5)
    if (insertedOrders) {
      const deliveredOrders = insertedOrders.filter((o: any) => o.status === 'delivered');
      const returnInserts = deliveredOrders.slice(0, 5).map((o: any) => ({
        vendor_id: userId,
        order_id: o.id,
        order_number: o.order_number,
        portal: o.portal,
        customer_name: o.customer_name,
        reason: ['Size issue', 'Defective product', 'Wrong item received', 'Quality not as expected', 'Changed mind'][Math.floor(Math.random() * 5)],
        refund_amount: Math.floor(o.total_amount * 0.9),
        status: 'requested',
      }));
      if (returnInserts.length > 0) {
        await supabase.from('returns').insert(returnInserts);
      }
    }

    // 6. Seed Settlements (3)
    const settlementInserts = portals.slice(0, 3).map((portal, i) => ({
      vendor_id: userId,
      settlement_id: `STL-${Date.now().toString(36).toUpperCase()}-${i + 1}`,
      portal,
      amount: 10000 + Math.floor(Math.random() * 50000),
      commission: 500 + Math.floor(Math.random() * 2000),
      tax: 200 + Math.floor(Math.random() * 500),
      net_amount: 8000 + Math.floor(Math.random() * 45000),
      status: ['pending', 'completed', 'processing'][i] as any,
      settlement_date: randomDate(14),
    }));
    await supabase.from('settlements').insert(settlementInserts);

    return new Response(JSON.stringify({ message: "Demo data seeded successfully", seeded: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
