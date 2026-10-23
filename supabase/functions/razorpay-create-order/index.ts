import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 if(req.method!=="POST") return json(405,{error:"Method not allowed"});
 const url=Deno.env.get("SUPABASE_URL"), anon=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), keyId=Deno.env.get("RAZORPAY_KEY_ID"), keySecret=Deno.env.get("RAZORPAY_KEY_SECRET");
 if(!url||!anon||!service||!keyId||!keySecret) return json(500,{error:"Payment server is not configured. Set Supabase and Razorpay secrets."});
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token) return json(401,{error:"Sign in before paying."});
 try {
  const userResp=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+token}});
  if(!userResp.ok) return json(401,{error:"Your session expired. Sign in again."});
  const user=await userResp.json(), body=await req.json(), customer=body.customer||{}, items=body.items;
  if(!Array.isArray(items)||!items.length) return json(400,{error:"Cart is empty."});
  const orderPayload={customerName:String(customer.name||"").trim(),customerPhone:String(customer.phone||"").trim(),customerEmail:String(user.email||customer.email||""),shippingAddress:String(customer.address||"").trim(),paymentMethod:"Razorpay",checkoutMetadata:{source:"shopify-lite",payment_gateway:"razorpay"}};
  const rpc=await fetch(url+"/rest/v1/rpc/shopify_lite_create_order",{method:"POST",headers:{apikey:anon,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({p_order:orderPayload,p_items:items.map((i:any)=>({id:i.id,quantity:Number(i.quantity)}))})});
  const saved=await rpc.json();
  if(!rpc.ok) return json(400,{error:saved.message||saved.error||"Could not create order."});
  const amountPaise=Math.round(Number(saved.total)*100);
  if(!Number.isSafeInteger(amountPaise)||amountPaise<100) return json(400,{error:"Order total is invalid; minimum payment is ₹1."});
  const rz=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:"Basic "+btoa(keyId+":"+keySecret),"Content-Type":"application/json"},body:JSON.stringify({amount:amountPaise,currency:"INR",receipt:String(saved.order_number||saved.id).slice(0,40),notes:{shopify_order_id:saved.id,shopify_order_number:String(saved.order_number)}})});
  const rzBody=await rz.json();
  if(!rz.ok){await fetch(url+"/rest/v1/shopify_lite_orders?id=eq."+encodeURIComponent(saved.id),{method:"PATCH",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({payment_status:"failed",updated_at:new Date().toISOString()})});return json(502,{error:"Razorpay could not create a payment order. No payment was taken; contact store support before retrying."});}
  const patch=await fetch(url+"/rest/v1/shopify_lite_orders?id=eq."+encodeURIComponent(saved.id),{method:"PATCH",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({payment_gateway:"razorpay",razorpay_order_id:rzBody.id,payment_status:"pending",payment_method:"Razorpay",updated_at:new Date().toISOString()})});
  if(!patch.ok) return json(500,{error:"Payment order created but database linking failed. Contact store support before retrying."});
  return json(200,{keyId,razorpayOrderId:rzBody.id,amount:rzBody.amount,currency:rzBody.currency,orderId:saved.id,orderNumber:saved.order_number,customer:{name:orderPayload.customerName,email:orderPayload.customerEmail,contact:orderPayload.customerPhone}});
 }catch(e){console.error("razorpay-create-order",e);return json(500,{error:"Unable to start payment. Please retry."});}
});