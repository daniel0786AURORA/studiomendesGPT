import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const url=process.env.SUPABASE_URL!;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY!;
export async function POST(req:Request){
 try{
  if(!url||!key)return NextResponse.json({error:"server_not_configured"},{status:503});
  const body=await req.json(); const {contact,answers,scores,overall}=body??{};
  if(!contact?.name||!contact?.whatsapp||!answers||!scores)return NextResponse.json({error:"invalid_payload"},{status:400});
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:lead,error:e1}=await supabase.from("leads").insert({name:String(contact.name).slice(0,120),company:String(contact.company||"").slice(0,160)||null,email:String(contact.email||"").slice(0,180)||null,phone:String(contact.whatsapp).slice(0,40),source:"website_scan",consent_contact:true}).select("id").single();
  if(e1)throw e1;
  const entries=Object.entries(scores as Record<string,number>);const low=entries.sort((a,b)=>a[1]-b[1])[0]?.[0]||null;
  const {data:session,error:e2}=await supabase.from("scan_sessions").insert({lead_id:lead.id,channel:"inbound",stage:"preanalysis_complete",overall_score:Number(overall)||0,attract_score:scores.attract,convert_score:scores.convert,operate_score:scores.operate,measure_score:scores.measure,scale_score:scores.scale,primary_bottleneck:low}).select("id").single();
  if(e2)throw e2;
  const messages=Object.entries(answers as Record<string,string>).map(([k,v])=>({session_id:session.id,role:"user",content:`${k}: ${String(v).slice(0,4000)}`}));
  if(messages.length){const {error}=await supabase.from("scan_messages").insert(messages);if(error)throw error}
  return NextResponse.json({ok:true,sessionId:session.id});
 }catch(e){console.error("scan submit failed",e);return NextResponse.json({error:"submit_failed"},{status:500})}
}