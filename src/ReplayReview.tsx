import {useEffect,useMemo,useState} from 'react';
import type {GameState} from './engine.ts';
import {cardText} from './engine.ts';
import {actionLabel,listReplayHands,replaySteps,stepView,streetLabel} from './replay-engine.ts';
import type {ReplayStep} from './replay-engine.ts';

const number=(value:number)=>new Intl.NumberFormat('ru-RU').format(value);
function ReplayCard({value,hidden=false}:{value?:string;hidden?:boolean}){
 const isRed=!!value&&(value.includes('♥')||value.includes('♦'));
 return <span className={`review-card ${isRed?'red':''} ${hidden?'back':''}`} aria-label={hidden?'Закрытая карта':value||'Нет карты'}>{hidden?'♠':value??'—'}</span>;
}
function DecisionDetails({step,phase}:{step:Extract<ReplayStep,{kind:'decision'}>;phase:'before'|'after'}){
 const view=stepView(step,phase)!;
 const event=step.decision;
 const hero=view.players.find(p=>p.id==='hero');
 const shownActor=view.players.find(p=>p.id===event.playerId);
 return <div className="review-content" aria-live="polite">
   <div className="review-felt">
     <div className="review-felt-top"><span>{streetLabel(view.street)}</span><strong>Банк {number(view.result&&view.lastPot?view.lastPot:view.pot)}</strong></div>
     <div className="review-board">{view.board.length?view.board.map((card,i)=><ReplayCard key={i} value={cardText(card)}/>):<span className="review-board-placeholder">Общие карты ещё не открыты</span>}</div>
     <div className="review-hero-cards"><span>Твои карты</span><div>{view.heroCards.map((card,i)=><ReplayCard key={i} value={cardText(card)}/>)}</div></div>
   </div>
   <div className="review-status">
     <span className="review-phase">{phase==='before'?'ДО ХОДА':'ПОСЛЕ ХОДА'}</span>
     <strong>{phase==='before'?`${shownActor?.name??event.playerId} выбирает действие`:step.label}</strong>
     <div className="review-summary-metrics"><span>Текущая ставка <b>{number(view.currentBet)}</b></span><span>Твой стек <b>{number(hero?.stack??0)}</b></span></div>
     {phase==='before'&&<div className="review-options">
       <span>Возможные действия: {event.options.ruleActions.map(x=>({fold:'фолд',check:'чек',call:'колл',raise:'рейз'} as const)[x]).join(', ')}</span>
       {event.options.toCall>0&&<span>К коллу: {number(event.options.toCall)}</span>}
       {event.options.minRaiseTo!==null&&<span>Рейз: от {number(event.options.minRaiseTo)} до {number(event.options.maxRaiseTo??0)}</span>}
       {event.options.callRequiresChange&&<span>На этот колл требовался размен фишек</span>}
     </div>}
     {phase==='after'&&<p className="review-action-info">Внесено в банк: {number(event.amountCommitted)}{view.result?` · ${view.result}`:''}</p>}
   </div>
   <details className="review-player-details">
     <summary>Стеки и ставки игроков <span>{view.players.length}</span></summary>
     <div className="review-player-list">{view.players.map(p=><div key={p.id} className={p.folded?'folded':''}>
       <span><strong>{p.name}</strong><small>{p.id===view.button?' · дилер':''}{p.folded?' · фолд':''}{p.allIn?' · олл-ин':''}</small></span>
       <span>Стек {number(p.stack)} <small>· ставка {number(p.streetBet)}</small></span>
     </div>)}</div>
   </details>
   <p className="review-privacy-note">Закрытые карты соперников и будущая колода не используются при воспроизведении. Стратегическая оценка пока недоступна.</p>
 </div>;
}
function LegacyDetails({step}:{step:Extract<ReplayStep,{kind:'legacy'}>}){
 const frame=step.frame;
 return <div className="review-content">
   <div className="review-felt">
     <div className="review-felt-top"><span>{streetLabel(frame.street)}</span><strong>Банк {number(frame.pot)}</strong></div>
     <div className="review-board">{frame.board.length?frame.board.map((c,i)=><ReplayCard key={i} value={c}/>):<span className="review-board-placeholder">Общие карты ещё не открыты</span>}</div>
     <div className="review-hero-cards"><span>Твои карты</span><div>{frame.players.find(p=>p.id==='hero')?.cards.map((c,i)=><ReplayCard key={i} value={c}/>)}</div></div>
   </div>
   <div className="review-status"><span className="review-phase">СТАРАЯ ЗАПИСЬ</span><strong>{frame.label}</strong><p>Для этой раздачи сохранились только отдельные кадры. Просмотр состояния до каждого действия недоступен.</p></div>
   <details className="review-player-details"><summary>Стеки и ставки игроков <span>{frame.players.length}</span></summary><div className="review-player-list">{frame.players.map(p=><div key={p.id}><span><strong>{p.name}</strong><small>{p.folded?' · фолд':''}</small></span><span>Стек {number(p.stack)} <small>· ставка {number(p.streetBet)}</small></span></div>)}</div></details>
 </div>;
}
/**
 * Single reusable viewer for in-game history and lab.
 * The component never mutates or evaluates a real poker hand.
 */
export default function ReplayReview({game}:{game:GameState}){
 const hands=useMemo(()=>listReplayHands(game),[game]);
 const [selectedNumber,setSelectedNumber]=useState<number|null>(null);
 const [stepIndex,setStepIndex]=useState(0);
 const [phase,setPhase]=useState<'before'|'after'>('before');
 const selected=hands.find(h=>h.number===selectedNumber)??hands[0];
 const steps=useMemo(()=>selected?replaySteps(selected):[],[selected]);
 const index=Math.min(stepIndex,Math.max(0,steps.length-1));
 const step=steps[index];
 useEffect(()=>{setStepIndex(0);setPhase('before');},[selected?.number]);
 return <div className="review-root">
   <div className="review-hand-list" aria-label="Выбрать раздачу">{hands.map(h=><button key={h.number} className={selected?.number===h.number?'active':''} aria-pressed={selected?.number===h.number} onClick={()=>{setSelectedNumber(h.number);setStepIndex(0);setPhase('before');}}>№{h.number}<span>{h.inProgress?'Идёт':(h.decisions?.length??0)?`${h.decisions?.length} решений`:'Старая запись'}</span></button>)}</div>
   {!selected?<p className="review-empty">Сыграй первую раздачу, чтобы открыть историю.</p>:!step?<p className="review-empty">В этой раздаче ещё не было решений.</p>:<>
     <div className="review-step-heading"><div><span>{streetLabel(step.street)}</span><strong>{step.label}</strong></div><span>Шаг {index+1} / {steps.length}</span></div>
     {step.kind==='decision'&&<div className="review-phase-picker" role="group" aria-label="Состояние решения">
       <button className={phase==='before'?'active':''} aria-pressed={phase==='before'} onClick={()=>setPhase('before')}>До хода</button>
       <button className={phase==='after'?'active':''} aria-pressed={phase==='after'} onClick={()=>setPhase('after')}>После хода</button>
     </div>}
     {step.kind==='decision'?<DecisionDetails step={step} phase={phase}/>:<LegacyDetails step={step}/>}
     <div className="review-navigation">
       <button disabled={index===0} onClick={()=>{setStepIndex(i=>Math.max(i-1,0));setPhase('before');}}>← Назад</button>
       <button disabled={index===steps.length-1} onClick={()=>{setStepIndex(i=>Math.min(i+1,steps.length-1));setPhase('before');}}>Дальше →</button>
     </div>
     {step.kind==='decision'&&<div className="review-timeline" aria-label="Ходы раздачи">{steps.map((item,i)=><button key={item.id} aria-label={`Ход ${i+1}: ${item.label}`} aria-current={i===index?'step':undefined} className={i===index?'current':''} onClick={()=>{setStepIndex(i);setPhase('before');}}/>)}</div>}
   </>}
 </div>;
}
