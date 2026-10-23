# Razorpay payments setup

Shopify-Lite uses Razorpay Standard Checkout with Supabase Edge Functions. Payment secrets must never be committed to GitHub Pages or browser JavaScript.

## Current implementation

- `razorpay-create-order`: authenticates the signed-in customer, creates a store order using database-authoritative product prices/tax/stock, creates the matching Razorpay order server-side, and stores its Razorpay order ID.
- `razorpay-verify-payment`: verifies the Checkout HMAC signature, fetches the payment from Razorpay, checks captured status, currency and exact amount, then calls a restricted database function to persist `payment_status = paid` and the payment ID.
- `razorpay-webhook`: verifies Razorpay's signature against the raw request body and updates captured payments asynchronously.
- Order payment fields and webhook-event table are in the Supabase database.

## One-time merchant setup

1. Create a Razorpay account at https://razorpay.com/ and complete the merchant/KYC/business activation steps Razorpay requests.
2. In Razorpay Dashboard, switch to **Test Mode** first and generate API keys under Account & Settings → API Keys. Keep the Key Secret private.
3. In Supabase Dashboard, open project `jtghqhfnruwtsfdxvsra` → Edge Functions → Secrets (or Project Settings → Edge Functions → Secrets) and add:
   - `RAZORPAY_KEY_ID` = your Razorpay test Key ID
   - `RAZORPAY_KEY_SECRET` = your Razorpay test Key Secret
   - `RAZORPAY_WEBHOOK_SECRET` = a long random secret you choose for the webhook endpoint
   Supabase supplies the project URL and service-role environment variables to Edge Functions. Never add the service-role key or Razorpay Key Secret to `index.html`, `supabase-client.js`, GitHub Pages, or a public repository.
4. In Razorpay Dashboard → Webhooks, add this URL:
   `https://jtghqhfnruwtsfdxvsra.supabase.co/functions/v1/razorpay-webhook`
   Use the exact same value you set as `RAZORPAY_WEBHOOK_SECRET`. Subscribe to `payment.captured` and `order.paid`. Save the webhook.
5. Test a checkout in Test Mode. Confirm the matching row in `public.shopify_lite_orders` shows `payment_status = paid`, `payment_gateway = razorpay`, a Razorpay payment ID in `razorpay_payment_id` and `transaction_reference`, and `payment_signature_verified = true`.
6. Before live payments, finish Razorpay account activation, create **Live Mode** keys, replace the Edge Function secrets with live values, and configure the Live Mode webhook. Do not use live credentials in test mode or vice versa.

## Supabase Edge Function endpoints

- Create payment order (JWT required): `https://jtghqhfnruwtsfdxvsra.supabase.co/functions/v1/razorpay-create-order`
- Verify payment (JWT required): `https://jtghqhfnruwtsfdxvsra.supabase.co/functions/v1/razorpay-verify-payment`
- Razorpay webhook (Razorpay signature required): `https://jtghqhfnruwtsfdxvsra.supabase.co/functions/v1/razorpay-webhook`

Payment status is never set to paid from the browser alone. The server verifies the signature and independently fetches the payment from Razorpay before updating the database. A webhook also supports recovery if the customer's browser closes after payment.
