# Razorpay Standard Checkout — Shopify-Lite

This repository is a static HTML/JavaScript site hosted on GitHub Pages. GitHub Pages cannot run a Node `/api/*` backend, so checkout uses authenticated Supabase Edge Functions in the **Shopify-Lite** project (`flquftroiodugeqvmrhm`). The PW Returns CRM project is separate and must not be changed.

## Implemented

- `razorpay-create-order`: requires a valid signed-in Supabase user, validates current product prices and stock from Supabase, calculates 18% GST on the server, creates a pending order and order items, and calls Razorpay's Orders API. It rejects totals below ₹1.
- `razorpay-verify-payment`: verifies the HMAC-SHA256 checkout signature on the server, checks the payment with Razorpay for matching order/amount/currency, captures an authorized payment, and only then marks the order paid.
- Existing frontend checkout opens Razorpay Standard Checkout and handles success, dismissal and payment failure. The Razorpay Key Secret is never returned to the browser.
- Both Edge Functions are deployed with JWT verification enabled.
- `.gitignore` ignores local `.env` files. `.env.example` is a placeholder template, not a place to put actual credentials.

## Required one-time setup (not yet completed automatically)

1. Open Supabase Dashboard for project `flquftroiodugeqvmrhm` → **Edge Functions** → **Secrets**.
2. Add these two secrets using the Razorpay **Test Mode** credentials:
   - `RAZORPAY_KEY_ID` = your test Key ID
   - `RAZORPAY_KEY_SECRET` = your test Key Secret
3. Keep both values in Supabase Edge Function secrets. Never put a real secret in `index.html`, `supabase-client.js`, GitHub Pages, a public `.env`, or any browser-prefixed variable.
4. Open the published site: https://rohitkumarprajapti1996-code.github.io/Shopify-Lite-E-Commerce/
5. Sign in, add a product, enter name/phone/address, and click **Confirm Order & Payment**. Use a payment method listed in Razorpay's official Test Mode documentation.
6. Verify in Supabase that `shopify_lite_orders` has `payment_status = paid`, `payment_signature_verified = true`, and a Razorpay payment ID; verify the related rows in `shopify_lite_order_items`.

## Function endpoints

- Create order: `https://flquftroiodugeqvmrhm.supabase.co/functions/v1/razorpay-create-order`
- Verify payment: `https://flquftroiodugeqvmrhm.supabase.co/functions/v1/razorpay-verify-payment`

Both require a signed-in user's JWT. The frontend invokes them through the configured Supabase client.

## Important limitations / go-live checklist

- This is not a Node app; do not install the Razorpay Node SDK into the static frontend. The functions use Razorpay's HTTPS API and Web Crypto.
- Test credentials are for test payments only. Complete Razorpay onboarding/KYC and use Live Mode credentials only after account activation.
- A checkout dismissed before payment leaves an unpaid pending order. Do not treat a browser success callback alone as proof of payment.
- Product stock is checked server-side at order creation but is not reserved/decremented atomically. Add atomic stock reservation and a Razorpay webhook before a high-volume production launch.
- Confirmation email requires its separate Resend secrets and a verified sender; this is not part of payment verification.
- If any real secret was ever committed to a public repository, rotate it immediately.
