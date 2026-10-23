-- Razorpay payment state and server-only payment confirmation.
alter table public.shopify_lite_orders
  add column if not exists payment_gateway text not null default 'manual',
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists payment_signature_verified boolean not null default false,
  add column if not exists paid_at timestamptz;

create unique index if not exists shopify_lite_orders_razorpay_order_id_uidx
  on public.shopify_lite_orders (razorpay_order_id)
  where razorpay_order_id is not null;
create unique index if not exists shopify_lite_orders_razorpay_payment_id_uidx
  on public.shopify_lite_orders (razorpay_payment_id)
  where razorpay_payment_id is not null;

create table if not exists public.shopify_lite_payment_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.shopify_lite_payment_webhook_events enable row level security;
revoke all on public.shopify_lite_payment_webhook_events from anon, authenticated;

create or replace function public.shopify_lite_mark_payment_paid(
  p_order_id uuid, p_razorpay_order_id text, p_razorpay_payment_id text
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.shopify_lite_orders;
begin
  select * into v_order from public.shopify_lite_orders
   where id = p_order_id and razorpay_order_id = p_razorpay_order_id
   for update;
  if not found then return false; end if;
  if v_order.payment_status = 'paid' then
    return v_order.razorpay_payment_id = p_razorpay_payment_id;
  end if;
  update public.shopify_lite_orders
     set payment_status = 'paid',
         payment_gateway = 'razorpay',
         razorpay_payment_id = p_razorpay_payment_id,
         transaction_reference = p_razorpay_payment_id,
         payment_signature_verified = true,
         paid_at = now(),
         updated_at = now()
   where id = p_order_id;
  return true;
end;
$$;
revoke all on function public.shopify_lite_mark_payment_paid(uuid,text,text) from public, anon, authenticated;
grant execute on function public.shopify_lite_mark_payment_paid(uuid,text,text) to service_role;
