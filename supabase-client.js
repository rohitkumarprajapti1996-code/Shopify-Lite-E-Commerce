/* Shopify-Lite Supabase client. Publishable key is safe for browser use; RLS protects data. */
(function () {
  const SUPABASE_URL = "https://jtghqhfnruwtsfdxvsra.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7oZomBiJG6yC-xW-9X1cng_WGgQiVT6";
  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase JS did not load.");
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const toAppProduct = (p) => ({
    id: p.id, sku: p.sku, title: p.title, description: p.description || "",
    category: p.category || "General", price: Number(p.price),
    salePrice: p.sale_price == null ? null : Number(p.sale_price),
    stock: Number(p.stock || 0), image: p.image_url || "",
    tags: p.tags || [], rating: 5, reviewsCount: 0
  });
  window.ShopifySupabase = {
    client,
    async sendPhoneOtp(phone) {
      return client.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
    },
    async verifyPhoneOtp(phone, token) {
      return client.auth.verifyOtp({ phone, token, type: "sms" });
    },
    async sendAdminEmailOtp(email) {
      return client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    },
    async verifyAdminEmailOtp(email, token) {
      return client.auth.verifyOtp({ email, token, type: "email" });
    },
    async isAdmin() {
      const { data, error } = await client.rpc("shopify_lite_is_admin");
      if (error) throw error;
      return data === true;
    },
    async loadProducts() {
      const { data, error } = await client.from("shopify_lite_products")
        .select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(toAppProduct);
    },
    async addProduct(product, userId) {
      const row = {
        sku: product.sku || null, title: product.title, description: product.description || "",
        category: product.category || "General", price: Number(product.price),
        sale_price: product.salePrice == null ? null : Number(product.salePrice),
        stock: Number(product.stock || 0), image_url: product.image || "",
        tags: product.tags || [], created_by: userId, is_active: true
      };
      const { data, error } = await client.from("shopify_products").insert(row).select("*").single();
      if (error) throw error;
      return toAppProduct(data);
    },
    async deleteProduct(id) {
      const { error } = await client.from("shopify_products").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    async uploadProductImage(file) {
      if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Choose a JPG, PNG, or WebP image.");
      }
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = Date.now() + "-" + safeName;
      const { error } = await client.storage.from("shopify-products").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = client.storage.from("shopify-products").getPublicUrl(path);
      return data.publicUrl;
    },
    async createOrder(order, items, userId) {
      if (!userId) throw new Error("Sign in with your verified mobile number before placing an order.");
      const { data, error } = await client.rpc("shopify_lite_create_order", {
        p_order: {
          customerName: order.customerName, customerPhone: order.customerPhone,
          customerEmail: order.customerEmail || "", shippingAddress: order.shippingAddress,
          subtotal: Number(order.subtotal), gstAmount: Number(order.gstAmount), total: Number(order.total),
          paymentMethod: order.paymentMethod, transactionId: "",
          checkoutMetadata: { source: "shopify-lite-github-pages", payment_status: "pending", payment_ui_is_demo: true }
        },
        p_items: items.map(item => ({ id: item.id, sku: item.sku || null, title: item.title, price: Number(item.price), quantity: Number(item.quantity) }))
      });
      if (error) throw error;
      return data;
    },
    async loadOrders() {
      const { data, error } = await client.from("shopify_lite_orders").select("*, shopify_lite_order_items(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
        async updateOrderStatus(orderId, status) {
      if (!/^[0-9a-f-]{36}$/i.test(String(orderId))) return;
      const allowed = ["Pending", "Confirmed", "Packed", "Dispatched", "Shipped", "Delivered", "Cancelled"];
      const normalized = status === "Ordered" ? "Pending" : status;
      if (!allowed.includes(normalized)) return;
      const { error } = await client.from("shopify_orders").update({ status: normalized, updated_at: new Date().toISOString() }).eq("id", orderId);
      if (error) throw error;
    }
  };
})();