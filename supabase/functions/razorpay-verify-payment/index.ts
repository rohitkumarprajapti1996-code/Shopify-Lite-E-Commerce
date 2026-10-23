import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:cors});
const hex=(bytes:Uint8Array)=>Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("");
const hmac=async(secret:string,value:string)=>{const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value))));};
const equal=(a:string,b:string)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;};
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json(405,{error:"Method not allowed"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),secret=Deno.env.get("RAZORPAY_KEY_SECRET"),keyId=Deno.env.get("RAZORPAY_KEY_ID");
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!url||!anon||!service||!secret||!keyId||!token)return json(500,{error:"Payment verification is not configured or session is missing."});
 try{
  const who=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+token}});
  if(!who.ok)return json(401,{error:"Sign in again to verify payment."});
  const user=await who.json(),b=await req.json(),orderId=String(b.orderId||""),rzOrder=String(b.razorpay_order_id||""),rzPayment=String(b.razorpay_payment_id||""),signature=String(b.razorpay_signature||"");
  if(!orderId||!rzOrder||!rzPayment||!signature)return json(400,{error:"Missing payment verification fields."});
  const lookup=await fetch(url+"/rest/v1/shopify_lite_orders?id=eq."+encodeURIComponent(orderId)+"&select=id,customer_id,total,razorpay_order_id,payment_status",{headers:{apikey:service,Authorization:"Bearer "+service}});
  const rows=await lookup.json(),order=rows?.[0];
  if(!order||order.customer_id!==user.id||order.razorpay_order_id!==rzOrder)return json(403,{error:"Payment does not match your order."});
  if(!equal(await hmac(secret,rzOrder+"|"+rzPayment),signature))return json(400,{error:"Invalid Razorpay signature. Payment not marked paid."});
  const payResp=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(rzPayment),{headers:{Authorization:"Basic "+btoa(keyId+":"+secret)}});
  const pay=await payResp.json();
  if(!payResp.ok||pay.order_id!==rzOrder||pay.status!=="captured"||Number(pay.amount)!==Math.round(Number(order.total)*100)||pay.currency!=="INR")return json(202,{status:"pending",message:"Payment is not captured yet; order remains pending."});
  const marked=await fetch(url+"/rest/v1/rpc/shopify_lite_mark_payment_paid",{method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"},body:JSON.stringify({p_order_id:orderId,p_razorpay_order_id:rzOrder,p_razorpay_payment_id:rzPayment})});
  const ok=await marked.json();
  if(!marked.ok||ok!==true)return json(500,{error:"Payment verified but order update needs support review."});
  return json(200,{status:"paid",orderId,paymentId:rzPayment});
 }catch(e){console.error("razorpay-verify-payment",e);return json(500,{error:"Could not verify payment. Check order status before retrying."});}
});