# Shopify-Lite + Supabase setup

This site uses the existing Supabase project at https://jtghqhfnruwtsfdxvsra.supabase.co.
The browser client uses only the Supabase publishable key. Never put a service-role key in GitHub Pages.

## Already configured
- Added separate `shopify_admins`, `shopify_products`, `shopify_orders`, `shopify_order_items`, and `shopify_dispatches` tables.
- Enabled RLS and configured policies for public product browsing, customer-owned orders, admin product changes, and dispatch management.
- Created the `shopify-products` Storage bucket with public image reads and admin-only writes.
- Added `supabase-client.js` and connected it from `index.html`.
- Customer sign-in now uses SMS OTP. Admin sign-in uses Supabase email/password and checks the private admin allow-list.
- Admin product creation and catalog loading use Supabase.

## Required dashboard setup before testing
1. Open Supabase Dashboard > Authentication > Sign In / Providers > Phone and enable Phone sign-in.
2. Configure a supported SMS provider in Supabase Auth settings. Real SMS will not work until a provider is configured. For India, check the SMS provider's TRAI/DLT requirements and sender/template registration.
3. In Authentication > Users, create or confirm the admin user for the existing admin email. Set a strong password. The email must match the active row in `public.shopify_admins`.
4. In Authentication > URL Configuration, add the GitHub Pages site URL to allowed redirect/site URLs if needed.
5. Test with a customer mobile number in E.164 format, e.g. `+919876543210`. Never use a production OTP in screenshots or public issues.
6. Verify GitHub Pages is deploying the `main` branch and repository root.

## Important limitations / next integration work
- Product images can currently be saved by URL; the Storage upload helper is available in `supabase-client.js`, but the product form still needs a file-picker control to upload a local image.
- The database tables and access policies for orders, order items, and dispatches are ready. The existing demo checkout and dispatch widgets still need to be connected to those tables before using them as a live order/dispatch system.
- The demo payment UI is not a real payment gateway. Do not treat its simulated payment message as proof of payment.
- Initial sample catalog and sample order data in the old demo are local examples; only products added after Supabase connection are persisted to the shared database.
- Existing CRM tables were not modified.

## Data access model
- Anyone may read active products and public product images.
- Only authenticated users on the admin allow-list can create/update/delete products, upload images, manage orders, and manage dispatch records.
- Customers can create orders for their own Supabase Auth user ID and read only their own orders/items/dispatch records.
- Do not grant customer write access to stock, order status, or dispatch tables.

## Useful references
- Phone OTP: https://supabase.com/docs/guides/auth/phone-login
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Storage access control: https://supabase.com/docs/guides/storage/security/access-control
