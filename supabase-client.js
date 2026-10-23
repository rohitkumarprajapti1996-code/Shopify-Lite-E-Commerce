/* Shopify-Lite Supabase client. Publishable key is safe for browser use; RLS protects data. */
(function () {
  const SUPABASE_URL = "https://flquftroiodugeqvmrhm.supabase.co";
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
      const { data, error } = await client.from("shopify_lite_products").insert(row).select("*").single();
      if (error) throw error;
      return toAppProduct(data);
    },
    async deleteProduct(id) {
      const { error } = await client.from("shopify_lite_products").update({ is_active: false }).eq("id", id);
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
      if (!userId) throw new Error("Sign in with your verified email address before placing an order.");
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
      const { data, error } = await client.from("shopify_lite_orders")
        .select("*, shopify_lite_order_items(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(o => ({
        id: o.order_number, databaseId: o.id, customerName: o.customer_name || "",
        customerPhone: o.customer_phone || "", customerEmail: o.customer_email || "",
        items: (o.shopify_lite_order_items || []).map(i => ({
          id: i.product_id || i.id, title: i.product_title, price: Number(i.unit_price),
          quantity: Number(i.quantity), sku: i.sku || ""
        })),
        subtotal: Number(o.subtotal || 0), gstAmount: Number(o.gst_amount || 0),
        total: Number(o.total || 0), date: (o.created_at || "").slice(0, 10),
        status: o.status || "Pending", shippingAddress: o.shipping_address || "",
        paymentMethod: o.payment_method || "COD", paymentStatus: o.payment_status || "pending",
        transactionId: o.transaction_reference || ""
      }));
    },
    async createRazorpayOrder(customer, items) {
      const { data, error } = await client.functions.invoke("razorpay-create-order", {
        body: {
          customer: { name: customer.name, phone: customer.phone, email: customer.email || "", address: customer.address },
          items: items.map(item => ({ id: item.id, quantity: Number(item.quantity) }))
        }
      });
      if (error) throw new Error(error.message || "Could not start Razorpay checkout.");
      if (!data || !data.razorpayOrderId) throw new Error(data?.error || "Payment order was not created.");
      return data;
    },
    async verifyRazorpayPayment(orderId, response) {
      const { data, error } = await client.functions.invoke("razorpay-verify-payment", {
        body: {
          orderId,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        }
      });
      if (error) throw new Error(error.message || "Could not verify Razorpay payment.");
      if (!data || data.status !== "paid") throw new Error(data?.message || data?.error || "Payment is not captured yet.");
      return data;
    },
    async updateOrderStatus(orderId, status) {
      if (!/^[0-9a-f-]{36}$/i.test(String(orderId))) return;
      const allowed = ["Pending", "Confirmed", "Packed", "Dispatched", "Shipped", "Delivered", "Cancelled", "Returned"];
      const normalized = status === "Ordered" ? "Pending" : status;
      if (!allowed.includes(normalized)) return;
      const { error } = await client.from("shopify_lite_orders")
        .update({ status: normalized, updated_at: new Date().toISOString() }).eq("id", orderId);
      if (error) throw error;
    }
  };
})();