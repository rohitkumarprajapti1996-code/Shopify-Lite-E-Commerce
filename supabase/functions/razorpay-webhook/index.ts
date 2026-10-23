import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const hex=(bytes:Uint8Array)=>Array.from(bytes).map(b=>b.toString(16).padStart(2,"0")).join("");
const hmac=async(secret:string,value:string)=>{const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value))));};
const equal=(a:string,b:string)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply(405,{error:"Method not allowed"});
 const secret=Deno.env.get("RAZORPAY_WEBHOOK_SECRET"),url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!secret||!url||!service)return reply(500,{error:"Webhook is not configured."});
 const raw=await req.text(),signature=req.headers.get("x-razorpay-signature")||"";
 if(!signature||!equal(await hmac(secret,raw),signature))return reply(401,{error:"Invalid webhook signature."});
 try{
  const event=JSON.parse(raw),eventId=req.headers.get("x-razorpay-event-id")||"",type=String(event.event||"");
  if(!eventId)return reply(400,{error:"Missing event ID."});
  if(!["payment.captured","order.paid"].includes(type))return reply(200,{received:true,ignored:true});
  const payment=event.payload?.payment?.entity,rzOrder=String(payment?.order_id||event.payload?.order?.entity?.id||""),paymentId=String(payment?.id||"");
  if(!rzOrder||!paymentId)return reply(400,{error:"Payment details missing."});
  const lookup=await fetch(url+"/rest/v1/shopify_lite_orders?razorpay_order_id=eq."+encodeURIComponent(rzOrder)+"&select=id,total,payment_status",{headers:{apikey:service,Authorization:"Bearer "+service}});
  const rows=await lookup.json(),order=rows?.[0];
  if(!order)return reply(404,{error:"Store order not found."});
  if(payment&&(payment.status!=="captured"||Number(payment.amount)!==Math.round(Number(order.total)*100)||payment.currency!=="INR"))return reply(400,{error:"Payment amount or status mismatch."});
  const reserve=await fetch(url+"/rest/v1/shopify_lite_payment_webhook_events",{method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({event_id:eventId,event_type:type})});
  if(!reserve.ok)return reply(500,{error:"Could not record webhook event."});
  const mark=await fetch(url+"/rest/v1/rpc/shopify_lite_mark_payment_paid",{method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"},body:JSON.stringify({p_order_id:order.id,p_razorpay_order_id:rzOrder,p_razorpay_payment_id:paymentId})});
  const result=await mark.json();
  if(!mark.ok||result!==true)return reply(500,{error:"Could not update payment status."});
  return reply(200,{received:true,status:"paid"});
 }catch(e){console.error("razorpay-webhook",e);return reply(500,{error:"Webhook processing failed."});}
});