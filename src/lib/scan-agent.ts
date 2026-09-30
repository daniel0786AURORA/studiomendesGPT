export type Pillar="attract"|"convert"|"operate"|"measure"|"scale";
export type Evidence={pillar:Pillar;evidence:string;confidence:number;source:"user"};
export type AgentState={nextQuestion:string;coverage:Record<Pillar,number>;evidence:Evidence[];ready:boolean};
const pillars:Pillar[]=["attract","convert","operate","measure","scale"];
const probes:Record<Pillar,string>={
 attract:"Quero entender melhor a entrada do funil: quais canais trazem oportunidades hoje, quantas mais ou menos por mês e quanto vocês investem para gerar isso?",
 convert:"Agora me ajuda a enxergar a conversão: o que acontece do primeiro contato até a venda? Se souber, traz volume de oportunidades, taxa de fechamento, ticket e tempo de resposta.",
 operate:"Onde a operação mais trava hoje? Me conta processos manuais, retrabalho, planilhas, sistemas desconectados ou atividades que dependem demais de uma pessoa.",
 measure:"Quais números vocês acompanham com frequência? Quero entender se conseguem ligar investimento, oportunidades, vendas, margem e resultado.",
 scale:"Se a demanda aumentasse bastante amanhã, qual seria o primeiro limite: equipe, processo, caixa, tecnologia, entrega ou aquisição?"
};
const signals:Record<Pillar,RegExp>={
 attract:/lead|tr[aá]fego|an[uú]ncio|indica|instagram|google|prospec|canal|demanda|oportunidade/i,
 convert:/crm|venda|fecha|convers|follow|proposta|ticket|comercial|resposta/i,
 operate:/planilha|manual|retrabalho|opera|processo|equipe|sistema|automat|demora/i,
 measure:/m[eé]trica|kpi|dashboard|dado|n[uú]mero|cac|roi|margem|fatur/i,
 scale:/escala|dobrar|capacidade|gargalo|caixa|contratar|crescer|estrutura/i
};
export function analyzeConversation(history:string[]):AgentState{
 const joined=history.join(" ");const coverage=Object.fromEntries(pillars.map(p=>[p,signals[p].test(joined)?65:15])) as Record<Pillar,number>;
 const evidence:Evidence[]=pillars.filter(p=>signals[p].test(joined)).map(p=>({pillar:p,evidence:"Há sinais relevantes deste eixo na conversa; o modelo deverá extrair a evidência textual específica.",confidence:.55,source:"user"}));
 const weakest=pillars.slice().sort((a,b)=>coverage[a]-coverage[b])[0];const ready=pillars.every(p=>coverage[p]>=60)&&history.length>=6;
 return {nextQuestion:ready?"Já tenho uma leitura inicial suficiente. Vou organizar os sinais e preparar tua pré-análise.":probes[weakest],coverage,evidence,ready};
}
