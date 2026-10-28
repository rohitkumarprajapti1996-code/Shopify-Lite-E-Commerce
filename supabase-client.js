/* Shopify-Lite Supabase client. Publishable key is safe for browser use; RLS protects data. */
(function () {
  const SUPABASE_URL = "https://flquftroiodugeqvmrhm.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_P2faaLLjkVZlT4CeUNTDiQ_nWT6kp9X";
  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase JS did not load.");
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { storageKey: "shopify-lite-customer-auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const adminClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { storageKey: "shopify-lite-admin-auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  const toAppProduct = (p) => ({
    id: p.id, sku: p.sku, title: p.title, description: p.description || "",
    category: p.category || "General", price: Number(p.price),
    salePrice: p.sale_price == null ? null : Number(p.sale_price),
    stock: Number(p.stock || 0), image: p.image_url || "",
    tags: p.tags || [], rating: 5, reviewsCount: 0
  });
  window.ShopifySupabase = {
    client,
    adminClient,
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
      const { data, error } = await adminClient.rpc("shopify_lite_is_admin");
      if (error) throw error;
      return data === true;
    },
    async loadProducts() {
      const { data, error } = await client.from("shopify_lite_products")
        .select("*").eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(toAppProduct);
    },
    async loadCustomerProfile(userId) {
      if (!userId) return null;
      const { data, error } = await client.from("shopify_lite_customer_profiles")
        .select("user_id,full_name,phone,shipping_address,pincode,landmark,updated_at")
        .eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data || null;
    },
    async saveCustomerProfile(profile, userId) {
      if (!userId) throw new Error("Sign in before saving your profile.");
      const row = {
        user_id: userId,
        full_name: String(profile.fullName || "").trim(),
        phone: String(profile.phone || "").trim(),
        shipping_address: String(profile.shippingAddress || "").trim(),
        pincode: String(profile.pincode || "").trim(),
        landmark: String(profile.landmark || "").trim(),
        updated_at: new Date().toISOString()
      };
      const { data, error } = await client.from("shopify_lite_customer_profiles")
        .upsert(row, { onConflict: "user_id" }).select().single();
      if (error) throw error;
      return data;
    },
    async loadCustomerAddresses(userId) {
      if (!userId) return [];
      const { data, error } = await client.from("shopify_lite_customer_addresses")
        .select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(a => ({
        id:a.id, label:a.label, address:a.address, pincode:a.pincode,
        landmark:a.landmark || "", days:a.label === "Office" ? "Monday to Friday" : "Monday to Sunday",
        startTime:a.start_time || "", endTime:a.end_time || ""
      }));
    },
    async saveCustomerAddress(userId, address) {
      if (!userId) throw new Error("Sign in to save an address.");
      const row = {
        user_id:userId, label:address.label, address:String(address.address || "").trim(),
        pincode:String(address.pincode || "").trim(), landmark:String(address.landmark || "").trim(),
        start_time:address.startTime || "", end_time:address.endTime || "", updated_at:new Date().toISOString()
      };
      const { data, error } = await client.from("shopify_lite_customer_addresses").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    async deleteCustomerAddress(userId, addressId) {
      if (!userId) throw new Error("Sign in to remove an address.");
      const { error } = await client.from("shopify_lite_customer_addresses").delete().eq("user_id", userId).eq("id", addressId);
      if (error) throw error;
    },
    async submitUpiPaymentProof(userId, order, file, transactionReference) {
      if (!userId || !order?.id) throw new Error("Sign in and create an order first.");
      if (!file || !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5*1024*1024)
        throw new Error("Upload a JPG, PNG or WebP payment screenshot under 5 MB.");
      const path = userId + "/" + order.id + "-" + Date.now() + "." + (file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg");
      const uploaded = await client.storage.from("shopify-payment-proofs").upload(path, file, { upsert:false, contentType:file.type });
      if (uploaded.error) throw uploaded.error;
      const { data, error } = await client.from("shopify_lite_payment_proofs").insert({
        order_id:order.id, customer_id:userId, storage_path:path,
        claimed_amount:Number(order.total), transaction_reference:String(transactionReference || "").trim(),
        review_status:"pending"
      }).select().single();
      if (error) throw error;
      return data;
    },
    async sendOrderConfirmation(order) {
      const { data, error } = await client.functions.invoke("shopify-order-confirmation", { body: { order } });
      if (error) throw new Error(error.message || "Order saved, but confirmation email could not be sent.");
      if (!data || data.sent !== true) throw new Error(data?.error || "Order saved, but confirmation email could not be sent.");
      return data;
    },
    async addProduct(product, userId) {
      const row = {
        sku: product.sku || null, title: product.title, description: product.description || "",
        category: product.category || "General", price: Number(product.price),
        sale_price: product.salePrice == null ? null : Number(product.salePrice),
        stock: Number(product.stock || 0), image_url: product.image || "",
        tags: product.tags || [], created_by: userId, is_active: true
      };
      const { data, error } = await adminClient.from("shopify_lite_products").insert(row).select("*").single();
      if (error) throw error;
      return toAppProduct(data);
    },
    async deleteProduct(id) {
      const { error } = await adminClient.from("shopify_lite_products").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    async uploadProductImage(file) {
      if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Choose a JPG, PNG, or WebP image.");
      }
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5 MB or smaller.");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = Date.now() + "-" + safeName;
      const { error } = await adminClient.storage.from("shopify-products").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = adminClient.storage.from("shopify-products").getPublicUrl(path);
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
    async loadOrders(forAdmin = false) {
      const db = forAdmin ? adminClient : client;
      const { data, error } = await db.from("shopify_lite_orders")
        .select("*, shopify_lite_order_items(*)").order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];
      const ids = rows.map(o => o.id).filter(Boolean);
      let dispatchByOrder = {};
      if (ids.length) {
        const { data: dispatches, error: dispatchError } = await db.from("shopify_lite_dispatches")
          .select("order_id,courier,tracking_number,tracking_url,warehouse,dispatched_at,delivered_at,status,notes,updated_at")
          .in("order_id", ids);
        if (dispatchError) throw dispatchError;
        (dispatches || []).forEach(d => { dispatchByOrder[d.order_id] = d; });
      }
      return rows.map(o => {
        const d = dispatchByOrder[o.id] || {};
        return {
          id: o.order_number, orderNumber: o.order_number, invoiceNumber: o.invoice_number || "", databaseId: o.id, customerName: o.customer_name || "",
          customerPhone: o.customer_phone || "", customerEmail: o.customer_email || "",
          items: (o.shopify_lite_order_items || []).map(i => ({
            id: i.product_id || i.id, title: i.product_title, price: Number(i.unit_price),
            quantity: Number(i.quantity), sku: i.sku || ""
          })),
          subtotal: Number(o.subtotal || 0), gstAmount: Number(o.gst_amount || 0),
          total: Number(o.total || 0), date: (o.created_at || "").slice(0, 10),
          status: d.status === "In Transit" ? "Shipped" : (d.status && d.status !== "Pending" ? d.status : (o.status || "Pending")),
          shippingAddress: o.shipping_address || "",
          paymentMethod: o.payment_method || "COD", paymentStatus: o.payment_status || "pending",
          transactionId: o.transaction_reference || "",
          courier: d.courier || "", trackingNumber: d.tracking_number || "",
          trackingUrl: d.tracking_url || "", warehouse: d.warehouse || "",
          dispatchStatus: d.status || o.status || "Pending",
          dispatchedAt: d.dispatched_at || null, deliveredAt: d.delivered_at || null
        };
      });
    },
    async saveDispatch(orderId, details) {
      if (!/^[0-9a-f-]{36}$/i.test(String(orderId))) throw new Error("Invalid order reference.");
      const { data: adminAllowed, error: adminError } = await adminClient.rpc("shopify_lite_is_admin");
      if (adminError) throw adminError;
      if (adminAllowed !== true) throw new Error("Only the authorized admin can manage shipments.");
      const courier = String(details.courier || "").trim();
      if (!courier) throw new Error("Select a logistics partner.");
      const status = ["Pending", "Packed", "Dispatched", "In Transit", "Delivered", "Exception", "Returned"].includes(details.status) ? details.status : "Dispatched";
      const now = new Date().toISOString();
      const row = {
        order_id: orderId, courier,
        tracking_number: String(details.trackingNumber || "").trim() || null,
        tracking_url: String(details.trackingUrl || "").trim() || null,
        warehouse: String(details.warehouse || "").trim() || null,
        status,
        dispatched_at: ["Dispatched", "In Transit", "Delivered"].includes(status) ? now : null,
        delivered_at: status === "Delivered" ? now : null,
        updated_by: (await adminClient.auth.getUser()).data?.user?.id || null,
        updated_at: now
      };
      const { data, error } = await adminClient.from("shopify_lite_dispatches")
        .upsert(row, { onConflict: "order_id" }).select().single();
      if (error) throw error;
      const orderStatus = status === "Packed" ? "Packed" : status === "Delivered" ? "Delivered" : status === "Returned" ? "Returned" : status === "Exception" ? "Dispatched" : status === "Pending" ? "Pending" : "Shipped";
      const { error: orderError } = await adminClient.from("shopify_lite_orders")
        .update({ status: orderStatus, updated_at: now }).eq("id", orderId);
      if (orderError) throw orderError;
      let emailSent = false;
      try {
        const { data: mailData, error: mailError } = await adminClient.functions.invoke("shopify-order-status-email", {
          body: { orderId, status, courier, trackingNumber: row.tracking_number, trackingUrl: row.tracking_url }
        });
        if (mailError) throw mailError;
        emailSent = mailData?.sent === true;
      } catch (mailErr) { console.warn("Shipment saved, but status email could not be sent:", mailErr); }
      return { ...data, emailSent };
    },
    async createRazorpayOrder(customer, items) {
      const { data, error } = await client.functions.invoke("razorpay-create-order", {
        body: {
          customer: { name: customer.name, phone: customer.phone, email: customer.email || "", address: customer.address },
          items: items.map(item => ({ id: item.id, quantity: Number(item.quantity) }))
        }
      });
      if (error) {
        let detail = "";
        try {
          const response = error.context;
          if (response && typeof response.clone === "function") {
            const payload = await response.clone().json();
            detail = payload?.error || payload?.message || "";
            if (payload?.code) detail = detail ? detail + " (" + payload.code + ")" : payload.code;
          }
        } catch (_) { /* Some network errors have no JSON response body. */ }
        throw new Error(detail || error.message || "Could not start Razorpay checkout.");
      }
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
      if (error) {
        let detail = "";
        try {
          const response = error.context;
          if (response && typeof response.clone === "function") {
            const payload = await response.clone().json();
            detail = payload?.error || payload?.message || "";
            if (payload?.code) detail = detail ? detail + " (" + payload.code + ")" : payload.code;
          }
        } catch (_) { /* Some network errors have no JSON response body. */ }
        throw new Error(detail || error.message || "Could not verify Razorpay payment.");
      }
      if (!data || data.status !== "paid") throw new Error(data?.message || data?.error || "Payment is not captured yet.");
      return data;
    },
    async updateOrderStatus(orderId, status) {
      if (!/^[0-9a-f-]{36}$/i.test(String(orderId))) return;
      const allowed = ["Pending", "Confirmed", "Packed", "Dispatched", "Shipped", "Delivered", "Cancelled", "Returned"];
      const normalized = status === "Ordered" ? "Pending" : status;
      if (!allowed.includes(normalized)) return;
      const { error } = await adminClient.from("shopify_lite_orders")
        .update({ status: normalized, updated_at: new Date().toISOString() }).eq("id", orderId);
      if (error) throw error;
      let emailSent = false;
      try {
        const { data, error: mailError } = await adminClient.functions.invoke("shopify-order-status-email", { body: { orderId, status: normalized } });
        if (mailError) throw mailError;
        emailSent = data?.sent === true;
      } catch (mailErr) { console.warn("Order status saved, but customer email could not be sent:", mailErr); }
      return { emailSent };
    }
  };
})();