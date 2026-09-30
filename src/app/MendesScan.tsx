"use client";
import {useMemo,useState} from "react";
const qs=[
 ["attract","De onde vêm a maior parte das oportunidades hoje?",["Indicação / orgânico","Anúncios","Prospecção ativa","É bem imprevisível"],[70,75,60,30]],
 ["convert","Quando um lead chega, existe um processo comercial claro até o fechamento?",["Sim, e medimos","Existe, mas varia","Muito depende de mim","Não temos processo"],[85,60,40,20]],
 ["operate","Quanto da operação ainda depende de tarefas manuais, planilhas ou retrabalho?",["Quase nada","Algumas partes","Bastante","Quase tudo"],[85,65,40,20]],
 ["measure","Tu consegue olhar números e saber onde está perdendo dinheiro ou oportunidade?",["Sim, com clareza","Mais ou menos","Só alguns números","Praticamente não"],[90,60,40,20]],
 ["scale","Se as vendas dobrassem no próximo mês, tua estrutura aguentaria?",["Sim, tranquilamente","Com alguns ajustes","Seria difícil","Viraria caos"],[90,65,40,20]]
] as const;
const labels:{[k:string]:string}={attract:"Atrair",convert:"Converter",operate:"Operar",measure:"Medir",scale:"Escalar"};
export default function MendesScan(){
 const [open,setOpen]=useState(false),[step,setStep]=useState(0),[scores,setScores]=useState<Record<string,number>>({});
 const done=step>=qs.length; const overall=useMemo(()=>{const v=Object.values(scores);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0},[scores]);
 const lowest=done?Object.entries(scores).sort((a,b)=>a[1]-b[1])[0]:null;
 function answer(score:number){const key=qs[step][0];setScores(s=>({...s,[key]:score}));setStep(x=>x+1)}
 function reset(){setStep(0);setScores({})}
 return <><button className="primary scanStart" onClick={()=>setOpen(true)}>Quero minha pré-análise <b>↗</b></button>
 {open&&<div className="scanModal" role="dialog" aria-modal="true" aria-label="Mendes Scan"><button className="scanClose" onClick={()=>setOpen(false)} aria-label="Fechar">×</button>
 <div className="scanPanel"><div className="scanTop"><span>MENDES SCAN · PRÉ-ANÁLISE</span><b>{done?"LEITURA INICIAL":`${step+1}/${qs.length}`}</b></div>
 {!done?<><div className="scanProgress"><i style={{width:`${(step/qs.length)*100}%`}}/></div><small>{labels[qs[step][0]]}</small><h3>{qs[step][1]}</h3><div className="scanOptions">{qs[step][2].map((x,i)=><button key={x} onClick={()=>answer(qs[step][3][i])}><span>0{i+1}</span>{x}<b>→</b></button>)}</div><p className="scanNote">Sem resposta certa. A ideia é localizar onde existe mais atrito hoje.</p></>:
 <div className="scanResult"><small>TEU MENDES SCORE INICIAL</small><div className="scoreBig">{overall}<span>/100</span></div><h3>O principal sinal de atenção está em <em>{lowest?labels[lowest[0]]:"—"}</em>.</h3><div className="scoreBars">{Object.entries(scores).map(([k,v])=><div key={k}><label>{labels[k]} <b>{v}</b></label><i><span style={{width:`${v}%`}}/></i></div>)}</div><p>Isso ainda não é um diagnóstico completo. É uma leitura rápida para indicar onde vale investigar primeiro.</p><div className="scanResultActions"><a className="primary" href="https://wa.me/5551984705191?text=Oi%2C%20fiz%20a%20pr%C3%A9-an%C3%A1lise%20do%20Mendes%20Scan%20e%20quero%20aprofundar." target="_blank" rel="noreferrer">Quero aprofundar <b>↗</b></a><button onClick={reset}>Refazer leitura</button></div></div>}
 </div></div>}</>
}