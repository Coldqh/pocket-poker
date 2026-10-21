import {useState} from 'react';
import type {GameState,HandReplay} from './engine';
import {chanceToImprove,compareBuiltHands,evaluateBuiltHand,facingBetOdds,LAB_CARD_OPTIONS,potOddsRequired,simplifiedCallEV} from './lab';

type Mode='odds'|'cards'|'replay';
const QUESTIONS=[
  {pot:120,bet:60,outs:9,draws:1 as const,title:'Флеш-дро на тёрне'},
  {pot:100,bet:20,outs:12,draws:1 as const,title:'Дешёвый колл'},
  {pot:200,bet:100,outs:8,draws:2 as const,title:'Две карты до ривера'}
];
const percent=(n:number)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n*100)+'%';
const toMoney=(n:number)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n);
const suits=['♠','♥','♦','♣'] as const;
const ranks=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
function LabCard({value,onClick,empty=false}:{value:string|null;onClick?:()=>void;empty?:boolean}){
 return <button type="button" className={`lab-card ${value?.includes('♥')||value?.includes('♦')?'red':''} ${empty?'empty':''}`} onClick={onClick} disabled={!onClick} aria-label={value?'Карта '+value:'Выбрать карту'}>{value??'+'}</button>;
}
function RangeControl({title,value,min,max,step=1,onChange}:{title:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void}){
 return <div className="lab-range"><div className="lab-range-label"><strong>{title}</strong><b>{value}</b></div><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></div>;
}
function OddsLab(){
 const [pot,setPot]=useState(120),[bet,setBet]=useState(60),[outs,setOuts]=useState(9),[draws,setDraws]=useState<1|2>(1);
 const [task,setTask]=useState(0),[guess,setGuess]=useState<'call'|'fold'|null>(null);
 const required=potOddsRequired(pot,bet),chance=chanceToImprove(outs,draws===1?46:47,draws);
 const ev=simplifiedCallEV(pot,bet,chance),chosen=QUESTIONS[task];
 const answerChance=chanceToImprove(chosen.outs,chosen.draws===1?46:47,chosen.draws);
 const answerNeeded=potOddsRequired(chosen.pot,chosen.bet),correctAnswer=answerChance>=answerNeeded?'call':'fold';
 return <div className="lab-body"><div className="lab-tools-heading"><h2>Шансы банка</h2><p>Меняй ставку и количество аутов. Результат пересчитается сразу.</p></div>
  <div className="lab-controls"><RangeControl title="Банк до ставки" value={pot} min={20} max={1000} step={10} onChange={setPot}/><RangeControl title="Ставка соперника" value={bet} min={5} max={500} step={5} onChange={setBet}/><RangeControl title="Чистые ауты" value={outs} min={0} max={20} onChange={setOuts}/><div className="lab-inline"><strong>Карт осталось</strong><div className="lab-toggle"><button className={draws===1?'active':''} onClick={()=>setDraws(1)}>1 карта</button><button className={draws===2?'active':''} onClick={()=>setDraws(2)}>2 карты</button></div></div></div>
  <div className="lab-odds-result"><div className="lab-odds-figures"><div><span>Нужно для колла</span><strong>{percent(required)}</strong></div><div><span>Шанс улучшиться</span><strong>{percent(chance)}</strong></div></div><div className="lab-compare-track"><span style={{width:`${required*100}%`}}/><i style={{left:`${chance*100}%`}}/></div><div className="lab-odds-summary"><b>{chance>=required?'По прямым шансам колл проходит':'По прямым шансам — фолд'}</b><span>Условный EV колла: {ev>=0?'+':''}{toMoney(ev)}</span></div></div>
  <p className="lab-disclaimer">Модель предполагает чистые ауты, отсутствие будущих ставок, гарантированный просмотр оставшихся карт и отсутствие дополнительных соперников. Вероятность улучшиться не всегда равна эквити руки.</p>
  <div className="lab-mini-quiz"><div className="lab-quiz-heading"><span>Проверка {task+1} / {QUESTIONS.length}</span><strong>{chosen.title}</strong></div><p>Банк {chosen.pot}, ставка {chosen.bet}, аутов {chosen.outs}, карт до ривера {chosen.draws}. Будущих ставок нет. Что выберешь?</p><div className="lab-quiz-options"><button disabled={guess!==null} onClick={()=>setGuess('fold')}>Фолд</button><button disabled={guess!==null} onClick={()=>setGuess('call')}>Колл</button></div>{guess!==null&&<div className="lab-quiz-answer"><strong>{guess===correctAnswer?'Верно':'Есть ошибка'}</strong><span>Требуется {percent(answerNeeded)}, вероятность улучшиться {percent(answerChance)}. {correctAnswer==='call'?'Колл проходит по расчёту.':'Колл не проходит по расчёту.'}</span><button onClick={()=>{setTask(n=>(n+1)%QUESTIONS.length);setGuess(null);}}>Следующая ситуация →</button></div>}</div>
 </div>;
}
function CardsLab(){
 const [hero,setHero]=useState<(string|null)[]>(['A♠','K♠']);
 const [villain,setVillain]=useState<(string|null)[]>(['Q♥','Q♦']);
 const [board,setBoard]=useState<(string|null)[]>(['2♠','7♠','J♦',null,null]);
 const [slot,setSlot]=useState<{type:'hero'|'villain'|'board';index:number}|null>(null);
 const [suit,setSuit]=useState<typeof suits[number]>('♠');
 const used=new Set([...hero,...villain,...board].filter((x):x is string=>x!==null));
 const makeCards=(values:(string|null)[],type:'hero'|'villain'|'board')=>values.map((value,i)=><LabCard key={type+i} value={value} empty={!value} onClick={()=>setSlot({type,index:i})}/>);
 const complete=(cards:(string|null)[]):string[]|null=>cards.every(v=>v!==null)?cards as string[]:null;
 const publicBoard=board.filter((v):v is string=>v!==null);
 const boardIsContinuous=board.every((v,i)=>v!==null||board.slice(i+1).every(x=>x===null));
 const nameHero=boardIsContinuous&&complete(hero)?evaluateBuiltHand(complete(hero)!,publicBoard):null;
 const nameVillain=boardIsContinuous&&complete(villain)?evaluateBuiltHand(complete(villain)!,publicBoard):null;
 const result=boardIsContinuous&&complete(hero)&&complete(villain)?compareBuiltHands(complete(hero)!,complete(villain)!,publicBoard):null;
 const setCard=(value:string|null)=>{
  if(!slot)return;
  const update=(old:(string|null)[])=>old.map((c,i)=>i===slot.index?value:c);
  if(slot.type==='hero')setHero(update);
  else if(slot.type==='villain')setVillain(update);
  else setBoard(update);
  setSlot(null);
 };
 const deal=()=>{
  const options=[...LAB_CARD_OPTIONS];
  for(let i=options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
  setHero(options.slice(0,2));setVillain(options.slice(2,4));setBoard(options.slice(4,9));
 };
 return <div className="lab-body"><div className="lab-tools-heading"><h2>Конструктор раздачи</h2><p>Нажимай на карты, чтобы собрать любую ситуацию. Сравнение комбинаций обновляется сразу.</p></div>
  <div className="lab-builder"><div className="lab-hands"><div><span>Твоя рука</span><div className="lab-cards">{makeCards(hero,'hero')}</div><strong>{nameHero??'Выбери карты'}</strong></div><div><span>Соперник</span><div className="lab-cards">{makeCards(villain,'villain')}</div><strong>{nameVillain??'Выбери карты'}</strong></div></div>
   <div className="lab-builder-felt"><span>ОБЩИЕ КАРТЫ</span><div className="lab-cards">{makeCards(board,'board')}</div></div>
  </div>
  <div className="lab-builder-result">{result===null?'Укажи две руки и пять общих карт для определения победителя.':result>0?'Побеждает твоя рука':result<0?'Побеждает соперник':'Банк делится поровну'}{!boardIsContinuous&&<small>Общие карты нужно добавлять по порядку: флоп, тёрн, ривер.</small>}</div>
  <div className="lab-builder-actions"><button onClick={deal}>Случайная раздача</button><button onClick={()=>{setHero([null,null]);setVillain([null,null]);setBoard([null,null,null,null,null]);}}>Очистить</button></div>
  <p className="lab-disclaimer">Здесь рассчитывается лучшая готовая комбинация из пяти карт. Шансы на победу до ривера требуют отдельного расчёта эквити.</p>
  {slot&&<div className="sheet-scrim lab-picker-scrim" onClick={()=>setSlot(null)}><section className="bottom-sheet lab-picker" role="dialog" aria-modal="true" aria-label="Выбрать карту" onClick={e=>e.stopPropagation()}><div className="sheet-head"><h2>Выбрать карту</h2><button className="icon-button" onClick={()=>setSlot(null)} aria-label="Закрыть">×</button></div><div className="lab-suit-picker">{suits.map(x=><button className={suit===x?'active':''} key={x} onClick={()=>setSuit(x)}>{x}</button>)}</div><div className="lab-rank-picker">{ranks.map(rank=>{const card=rank+suit;const current=(slot.type==='hero'?hero:slot.type==='villain'?villain:board)[slot.index];return <button key={card} disabled={used.has(card)&&current!==card} onClick={()=>setCard(card)} className={suit==='♥'||suit==='♦'?'red':''}>{rank}{suit}</button>;})}</div><button className="ghost-button" onClick={()=>setCard(null)}>Очистить эту карту</button></section></div>}
 </div>;
}
function ReplayLab({game}:{game:GameState}){
 const replays=[...(game.replayArchive??[])].reverse().filter(r=>r.frames?.length>0);
 const [number,setNumber]=useState<number|null>(null),[index,setIndex]=useState(0);
 const replay:HandReplay|undefined=replays.find(r=>r.number===number)??replays[0];
 const frame=replay?.frames[Math.min(index,replay.frames.length-1)];
 const hero=frame?.players.find(p=>p.id==='hero');
 const toCall=frame&&hero&&!hero.folded?Math.max(0,Math.max(...frame.players.filter(p=>!p.folded).map(p=>p.streetBet),0)-hero.streetBet):0;
 const threshold=frame&&toCall?facingBetOdds(frame.pot,toCall):0;
 return <div className="lab-body"><div className="lab-tools-heading"><h2>Мои раздачи</h2><p>Восстановление действий из истории. Анализируй факты без догадок о скрытых картах.</p></div>
 {replays.length===0?<div className="lab-empty">История пока пуста. Сыграй хотя бы одну раздачу, и она появится здесь.</div>:<><div className="lab-replay-picks">{replays.map(r=><button key={r.number} className={replay?.number===r.number?'active':''} onClick={()=>{setNumber(r.number);setIndex(0);}}>#{r.number}</button>)}</div>{frame&&<><div className="lab-frame-head"><strong>{frame.label}</strong><span>{Math.min(index+1,replay.frames.length)} / {replay.frames.length}</span></div><div className="lab-replay-board"><span>Банк {frame.pot}</span><div className="lab-replay-cards">{frame.board.map((card,i)=><LabCard key={i} value={card}/>)}</div></div><div className="lab-frame-players">{frame.players.map(p=><div className={p.folded?'folded':''} key={p.id}><b>{p.name}</b><span>Стек {p.stack} · ставка {p.streetBet}{p.folded?' · пас':''}</span><div className="lab-replay-cards">{p.cards.map((card,i)=><LabCard key={i} value={card}/>)}</div></div>)}</div>{toCall>0&&<div className="lab-frame-odds">Если сейчас нужно ответить на ставку {toCall}, прямой порог колла — <strong>{percent(threshold)}</strong> (без будущих ставок).</div>}<div className="lab-replay-controls"><button disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))}>← Назад</button><button disabled={index>=replay.frames.length-1} onClick={()=>setIndex(i=>Math.min(replay.frames.length-1,i+1))}>Дальше →</button></div></>}</>}
 <p className="lab-disclaimer">История показывает сохранённые состояния стола. Она не определяет, было ли действие GTO-оптимальным, и не раскрывает скрытые карты до вскрытия.</p>
 </div>;
}
export default function PokerLab({game,onBack}:{game:GameState;onBack:()=>void}){
 const [mode,setMode]=useState<Mode>('odds');
 return <div className="poker-lab"><div className="study-header"><button className="icon-button" aria-label="Назад к академии" onClick={onBack}>‹</button><strong>Лаборатория</strong><span className="small-muted">POCKET 1.0</span></div><div className="lab-tabs" role="tablist" aria-label="Инструменты лаборатории"><button role="tab" aria-selected={mode==='odds'} className={mode==='odds'?'active':''} onClick={()=>setMode('odds')}>Шансы</button><button role="tab" aria-selected={mode==='cards'} className={mode==='cards'?'active':''} onClick={()=>setMode('cards')}>Карты</button><button role="tab" aria-selected={mode==='replay'} className={mode==='replay'?'active':''} onClick={()=>setMode('replay')}>Раздачи</button></div>{mode==='odds'?<OddsLab/>:mode==='cards'?<CardsLab/>:<ReplayLab game={game}/>}</div>;
}
