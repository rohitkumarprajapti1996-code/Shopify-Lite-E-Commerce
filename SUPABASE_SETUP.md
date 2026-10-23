# Shopify-Lite E-Commerce — Dedicated Supabase Project

This website now uses its own Supabase project, separate from PW Returns CRM.

- Project URL: https://flquftroiodugeqvmrhm.supabase.co
- Project ref: flquftroiodugeqvmrhm
- Browser key: publishable key only (stored in `supabase-client.js`)
- Admin allow-list: `rohitkumarprajapti1996@gmail.com`

## Separate project and CRM protection
Do not change the PW Returns CRM Supabase project or its Auth email template. Customize email templates only in the Shopify-Lite project above.

## Database setup completed
- Dedicated `shopify_lite_products`, `shopify_lite_orders`, `shopify_lite_order_items`, `shopify_lite_dispatches`, `shopify_lite_admins`, and payment webhook event tables.
- Row Level Security enabled and policies added for product browsing, admin product/dispatch management, and customer-owned order reads.
- `shopify_lite_create_order` validates active products and stock on the server and computes totals from database prices.
- `shopify-products` Storage bucket configured for public image reads and allow-listed admin uploads.
- GitHub Pages client points at the dedicated project.

## Required dashboard steps
1. Open [Shopify-Lite Supabase Authentication](https://supabase.com/dashboard/project/flquftroiodugeqvmrhm/auth/users).
2. In Authentication → URL Configuration, set Site URL to `https://rohitkumarprajapti1996-code.github.io/Shopify-Lite-E-Commerce/` and add that URL to Redirect URLs.
3. In Authentication → Email, configure the Shopify-Lite email templates. Use a subject such as `Your Shopify-Lite verification code` and a branded Shopify-Lite message. Do not edit the PW Returns CRM project.
4. Confirm email OTP/password sign-in is enabled in Auth settings.
5. Add products in the Shopify-Lite admin after admin sign-in; the new project starts with an empty catalog and no old-project product/order records were copied.
6. Do not add service-role keys or payment secrets to GitHub Pages.

## Important
- Admin authorization comes from the server-side allow-list in `shopify_lite_admins`, not from a client-side label. The authorized email must match exactly.
- A new Supabase project starts with no customer accounts; customers must register again.
- Razorpay is not yet fully configured in this new project. Add Razorpay secrets only as Supabase Edge Function secrets after creating your merchant account. Never mark an order paid based only on a browser callback.
- Verify the auth flow and RLS policies before accepting live orders.

## Customer profile persistence and order confirmation email

- Customer delivery profiles are stored in `public.shopify_lite_customer_profiles` in this dedicated Shopify-Lite project. RLS restricts each signed-in customer to their own profile.
- The checkout saves the customer's name, phone, shipping address and PIN code before starting payment, and reloads saved profile values on later sign-ins.
- The `shopify-order-confirmation` Edge Function is deployed. It validates the signed-in customer and sends a receipt email through Resend after the frontend receives a successful Razorpay verification.
- To enable email sending, configure **Edge Function secrets** in this Shopify-Lite project (Supabase Dashboard → Edge Functions → Secrets; wording may vary):
  - `RESEND_API_KEY`: an API key from your Resend account.
  - `ORDER_EMAIL_FROM`: a sender identity verified with Resend, for example `Shopify-Lite <orders@your-verified-domain.example>`. Replace the example with your own verified sender; do not use an address you do not control.
- Never place the Resend API key in `index.html`, `supabase-client.js`, GitHub, or any browser code. After setting the secrets, test with a real account and a successful test payment.
- The storefront currently expects `razorpay-create-order` and `razorpay-verify-payment` Edge Functions. Confirm these are deployed and configured with Razorpay credentials before enabling live payments. The order-confirmation function alone does not process payments.
- The 100 additional products are starter/sample catalog entries with illustrative pricing, stock and generic image URLs. They are not verified Amazon imports or proof of supplier availability; verify supplier, product claims, imagery, pricing, tax and stock before selling.
- PW Returns CRM project `jtghqhfnruwtsfdxvsra` is separate and must not be changed for Shopify-Lite work.
