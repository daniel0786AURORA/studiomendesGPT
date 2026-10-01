import { NextResponse } from "next/server";
import { analyzeConversation } from "@/lib/scan-agent";

type AgentReply = ReturnType<typeof analyzeConversation>;

const systemPrompt = `Você é o agente de diagnóstico do Mendes Scan, do Studio Mendes.
Conduza uma conversa consultiva em português brasileiro, natural, objetiva e sem parecer formulário.
Seu objetivo é entender o negócio e reunir evidências em cinco eixos:
attract = atração/aquisição de demanda;
convert = processo comercial e conversão;
operate = operação, processos e automação;
measure = métricas, dados, margem e capacidade de decisão;
scale = capacidade de crescer sem quebrar operação, caixa ou entrega.

Faça UMA pergunta por vez, escolhida com base no que ainda está pouco claro.
Busque números quando fizer sentido: faturamento/faixa, ticket, leads/oportunidades, vendas, investimento, CAC, margem, tempo de resposta, capacidade.
Não invente dados. Não presuma problemas. Evidências devem vir do que o usuário disse.
Só marque ready=true quando houver contexto de negócio e evidência razoável nos cinco eixos; normalmente não antes de 6 respostas úteis.
Retorne SOMENTE JSON válido, sem markdown, neste formato:
{"nextQuestion":"string","coverage":{"attract":0,"convert":0,"operate":0,"measure":0,"scale":0},"evidence":[{"pillar":"attract","evidence":"string","confidence":0.0,"source":"user"}],"ready":false}
coverage vai de 0 a 100 e confidence de 0 a 1.
Quando ready=true, nextQuestion deve dizer brevemente que já há contexto suficiente para preparar a pré-análise.`;

function normalize(data: any, fallback: AgentReply): AgentReply {
  const pillars = ["attract","convert","operate","measure","scale"] as const;
  const coverage = Object.fromEntries(pillars.map(p => [p, Math.max(0, Math.min(100, Number(data?.coverage?.[p]) || fallback.coverage[p]))])) as AgentReply["coverage"];
  const evidence = Array.isArray(data?.evidence) ? data.evidence.filter((e:any)=>pillars.includes(e?.pillar) && typeof e?.evidence==="string").slice(0,20).map((e:any)=>({pillar:e.pillar,evidence:e.evidence.slice(0,500),confidence:Math.max(0,Math.min(1,Number(e.confidence)||0.5)),source:"user" as const})) : fallback.evidence;
  return { nextQuestion: typeof data?.nextQuestion === "string" && data.nextQuestion.trim() ? data.nextQuestion.trim().slice(0,700) : fallback.nextQuestion, coverage, evidence, ready: Boolean(data?.ready) };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const history = Array.isArray(body?.history) ? body.history.filter((x: unknown) => typeof x === "string" && x.trim()).slice(-30) : [];
    if (!history.length) return NextResponse.json({ error: "history_required" }, { status: 400 });

    const fallback = analyzeConversation(history);
    const key = process.env.GEMINI_API_KEY;
    if (!key) return NextResponse.json({...fallback,_provider:"fallback",_reason:"missing_key"});

    const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(8000) });
    if (!modelsResponse.ok) return NextResponse.json({...fallback,_provider:"fallback",_reason:`models_http_${modelsResponse.status}`});
    const modelsPayload = await modelsResponse.json();
    const available = Array.isArray(modelsPayload?.models) ? modelsPayload.models : [];
    const compatible = available.filter((m:any)=>Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"));
    const configured = process.env.GEMINI_MODEL?.replace(/^models\//,"");
    const configuredMatch = configured ? compatible.find((m:any)=>(m?.name||"").replace(/^models\//,"")===configured) : undefined;
    const preferred = configuredMatch || compatible.find((m:any)=>/gemini.*flash/i.test(m?.name||"")) || compatible.find((m:any)=>/gemini/i.test(m?.name||"")) || compatible[0];
    const model = typeof preferred?.name === "string" ? preferred.name.replace(/^models\//,"") : undefined;
    if (!model) return NextResponse.json({...fallback,_provider:"fallback",_reason:"no_compatible_model"});
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: history.map((m:string,i:number)=>`${i%2===0?"USUÁRIO":"AGENTE"}: ${m}`).join("\n") }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.35, maxOutputTokens: 1800 }
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) { const detail = await response.text().catch(()=>""); console.error("Gemini API error", response.status, detail.slice(0,800)); return NextResponse.json({...fallback,_provider:"fallback",_reason:`gemini_http_${response.status}_${model}`}); }
    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return NextResponse.json({...fallback,_provider:"fallback",_reason:"empty_gemini_response"});
    return NextResponse.json({...normalize(JSON.parse(raw), fallback),_provider:"gemini",_model:model});
  } catch {
    return NextResponse.json({ error: "agent_failed" }, { status: 500 });
  }
}
