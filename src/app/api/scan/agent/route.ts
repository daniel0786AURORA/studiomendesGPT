import {NextResponse} from "next/server";
import {analyzeConversation} from "@/lib/scan-agent";
export async function POST(req:Request){
 try{
  const body=await req.json();const history=Array.isArray(body?.history)?body.history.filter((x:unknown)=>typeof x==="string").slice(-30):[];
  if(!history.length)return NextResponse.json({error:"history_required"},{status:400});
  return NextResponse.json(analyzeConversation(history));
 }catch{return NextResponse.json({error:"agent_failed"},{status:500})}
}
