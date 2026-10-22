import {useState} from 'react';
import type {GameState,HandReplay} from './engine';
import {chanceToImprove,compareBuiltHands,evaluateBuiltHand,bestFiveBuiltHand,LAB_CARD_OPTIONS,potOddsRequired,simplifiedCallEV} from './lab';

type Mode='odds'|'cards'|'replay';
const SITUATIONS=[
 {title:'За флешем',pot:120,bet:60,outs:9,draws:1 as const,description:'У тебя почти флеш. Одна карта ещё придёт. Девять карт из оставшихся гарантированно принесут победу.'},
 {title:'Выгодная цена?',pot:100,bet:20,outs:12,draws:1 as const,description:'Соперник поставил немного. Двенадцать карт сделают твою руку победной.'},
 {title:'Две попытки',pot:200,bet:100,outs:8,draws:2 as const,description:'До конца раздачи откроются ещё две карты. Восемь из них гарантированно помогут победить.'}
];
const suits=['♠','♥','♦','♣'] as const;
const ranks=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
const pct=(n:number)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n*100)+'%';
const money=(n:number)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n);
function LabCard({value,onClick,marked=false}:{value:string|null;onClick?:()=>void;marked?:boolean}){
 return <button type="button" className={'lab-card '+(value?.includes('♥')||value?.includes('♦')?'red ':'')+(!value?'empty ':'')+(marked?'lab-card-highlight':'')} onClick={onClick} disabled={!onClick} aria-label={value?'Карта '+value:'Выбрать карту'}>{value??'+'}</button>;
}
function LabHeading({number,title,onBack}:{number:string;title:string;onBack:()=>void}){
 return <div className="lab-easy-heading"><button className="icon-button" aria-label="Назад к инструментам" onClick={onBack}>←</button><strong>{title}</strong><span>{number} / 03</span></div>;
}
function RangeControl({title,value,min,max,step=1,onChange}:{title:string;value:number;min:number;max:number;step?:number;onChange:(n:number)=>void}){
 return <label className="lab-range"><span className="lab-range-label"><strong>{title}</strong><b>{value}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
function OddsLab({onBack}:{onBack:()=>void}){
 const [task,setTask]=useState(0);
 const start=SITUATIONS[task];
 const [pot,setPot]=useState(start.pot),[bet,setBet]=useState(start.bet),[outs,setOuts]=useState(start.outs),[draws,setDraws]=useState<1|2>(start.draws);
 const chance=chanceToImprove(outs,draws===1?46:47,draws),required=potOddsRequired(pot,bet),ev=simplifiedCallEV(pot,bet,chance);
 const choose=(index:number)=>{const example=SITUATIONS[index];setTask(index);setPot(example.pot);setBet(example.bet);setOuts(example.outs);setDraws(example.draws);};
 return <div className="lab-easy-screen lab-wonder-odds">
  <LabHeading number="02" title="Посмотри на ставки" onBack={onBack}/>
  <span className="eyebrow">ЭКСПЕРИМЕНТ / ШАНСЫ</span><h1>Когда ставка выгодна?</h1>
  <p className="lab-easy-lead">Начнём с готового примера. Двигай ставку и наблюдай, как меняется нужный шанс победы.</p>
  <div className="lab-wonder-presets">{SITUATIONS.map((x,i)=><button key={x.title} className={i===task?'active':''} onClick={()=>choose(i)}>{x.title}</button>)}</div>
  <div className="lab-easy-felt"><span>Сейчас в банке {money(pot+bet)}</span><div className="lab-pot-art" aria-hidden="true"><span/><span/><span/><span/><span/></div><div className="lab-situation-number">{money(bet)} <small>нужно добавить для колла</small></div></div>
  <div className="lab-wonder-slider"><RangeControl title="Сколько ставит соперник?" min={5} max={500} step={5} value={bet} onChange={setBet}/></div>
  <div className="lab-wonder-outcome"><span className="eyebrow">ПОКАЗЫВАЕМ НА ПРИМЕРЕ</span><h2>{chance>=required?'В этой модели колл проходит':'В этой модели лучше сбросить'}</h2>
   <div className="lab-easy-mathbar"><span style={{width:required*100+'%'}}/><i style={{left:chance*100+'%'}}/></div>
   <div className="lab-easy-mathlegend"><span>Нужно {pct(required)}</span><span>Есть {pct(chance)}</span></div>
   <p>Для ответа на ставку нужен шанс победы не ниже <strong>{pct(required)}</strong>. В нашем упрощённом примере выигрыш наступает с вероятностью <strong>{pct(chance)}</strong>.</p>
  </div>
  <details className="lab-easy-expert"><summary>Хочу понять расчёт и поменять условия</summary><div className="lab-easy-sliders">
    <p>{start.description} Предполагаем, что каждый указанный аут гарантированно выигрывает, а без него ты проигрываешь. Нет дележа банка и будущих ставок.</p>
    <RangeControl title="Банк до ставки" value={pot} min={20} max={1000} step={10} onChange={setPot}/>
    <RangeControl title="Выигрышные карты (ауты)" value={outs} min={0} max={20} onChange={setOuts}/>
    <div className="lab-easy-toggle"><strong>Осталось карт</strong><button className={draws===1?'active':''} onClick={()=>setDraws(1)}>Одна</button><button className={draws===2?'active':''} onClick={()=>setDraws(2)}>Две</button></div>
    <p className="lab-wonder-math">Порог: {bet} / ({pot} + {bet} + {bet}) = {pct(required)}. Условное EV колла: {ev>=0?'+':''}{money(ev)}. Вероятность улучшения реальной руки не всегда равна её эквити; модель не заменяет оценку диапазона соперника.</p>
   </div></details>
 </div>;
}
function CardsLab({onBack}:{onBack:()=>void}){
 const [hero,setHero]=useState<(string|null)[]>(['A♠','K♠']);
 const [villain,setVillain]=useState<(string|null)[]>(['Q♥','Q♦']);
 const [board,setBoard]=useState<(string|null)[]>(['2♠','7♠','J♦','9♣','3♥']);
 const [editing,setEditing]=useState(false);
 const [slot,setSlot]=useState<{type:'hero'|'villain'|'board';index:number}|null>(null);
 const [suit,setSuit]=useState<typeof suits[number]>('♠');
 const used=new Set([...hero,...villain,...board].filter((x):x is string=>x!==null));
 const complete=(cards:(string|null)[]):string[]|null=>cards.every(v=>v!==null)?cards as string[]:null;
 const holeHero=complete(hero),holeVillain=complete(villain),fiveBoard=complete(board);
 const result=holeHero&&holeVillain&&fiveBoard?compareBuiltHands(holeHero,holeVillain,fiveBoard):null;
 const outcome=result===null?'Добавь все карты, чтобы увидеть итог':result===0?'Банк делится поровну':result>0?'Побеждаешь ты':'Побеждает соперник';
 const heroName=holeHero?evaluateBuiltHand(holeHero,board.filter((v):v is string=>v!==null)):null;
 const villainName=holeVillain?evaluateBuiltHand(holeVillain,board.filter((v):v is string=>v!==null)):null;
 const heroBest=holeHero?bestFiveBuiltHand(holeHero,board.filter((v):v is string=>v!==null))??[]:[];
 const villainBest=holeVillain?bestFiveBuiltHand(holeVillain,board.filter((v):v is string=>v!==null))??[]:[];
 const highlight=result!==null?(result===0?[...new Set([...heroBest,...villainBest])]:result>0?heroBest:villainBest):[];
 const makeCards=(cards:(string|null)[],type:'hero'|'villain'|'board')=>cards.map((value,i)=><LabCard key={type+i} value={value} marked={Boolean(value&&highlight.includes(value))} onClick={editing?()=>setSlot({type,index:i}):undefined}/>);
 const setCard=(value:string|null)=>{
  if(!slot)return;
  const swap=(cards:(string|null)[])=>cards.map((old,i)=>i===slot.index?value:old);
  if(slot.type==='hero')setHero(swap);
  else if(slot.type==='villain')setVillain(swap);
  else setBoard(swap);
  setSlot(null);
 };
 const shuffle=()=>{
  const arr=[...LAB_CARD_OPTIONS];
  for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
  setHero(arr.slice(0,2));setVillain(arr.slice(2,4));setBoard(arr.slice(4,9));
 };
 return <div className="lab-easy-screen lab-wonder-cards">
  <LabHeading number="01" title="Исследуем комбинации" onBack={onBack}/>
  <span className="eyebrow">ЭКСПЕРИМЕНТ / КАРТЫ</span><h1>Какая рука сильнее?</h1><p className="lab-easy-lead">Смотри, какие пять карт определили победителя. Подсвеченные карты образуют лучшую комбинацию.</p>
  <div className="lab-compare-hands"><div><span>ТВОИ КАРТЫ</span><div className="lab-compare-cards">{makeCards(hero,'hero')}</div></div><div><span>СОПЕРНИК</span><div className="lab-compare-cards">{makeCards(villain,'villain')}</div></div></div>
  <div className="lab-compare-board"><span>КАРТЫ НА СТОЛЕ</span><div className="lab-compare-cards">{makeCards(board,'board')}</div></div>
  <div className="lab-wonder-outcome" aria-live="polite"><span className="eyebrow">РЕЗУЛЬТАТ</span><h2>{outcome}</h2><p>У тебя: <strong>{heroName??'пока неизвестно'}</strong>. У соперника: <strong>{villainName??'пока неизвестно'}</strong>.</p><p>В Техасском Холдеме выбираются лучшие пять из семи доступных карт.</p></div>
  <div className="lab-wonder-actions"><button className="big-primary" onClick={shuffle}>Показать другую раздачу ↻</button><button className="ghost-button" onClick={()=>setEditing(v=>!v)}>{editing?'Закончить изменение':'Выбрать свои карты'}</button></div>
  {editing&&<p className="lab-easy-lead">Нажимай на карты и меняй их. Повторы исключены — в одной колоде каждая карта только одна.</p>}
  {slot&&<div className="sheet-scrim lab-picker-scrim" onClick={()=>setSlot(null)}><section className="bottom-sheet lab-picker" role="dialog" aria-modal="true" aria-label="Выбор карты" onClick={e=>e.stopPropagation()}><div className="sheet-head"><h2>Выбери карту</h2><button className="icon-button" onClick={()=>setSlot(null)} aria-label="Закрыть">×</button></div><div className="lab-suit-picker">{suits.map(x=><button className={suit===x?'active':''} key={x} onClick={()=>setSuit(x)}>{x}</button>)}</div><div className="lab-rank-picker">{ranks.map(rank=>{const value=rank+suit;const current=(slot.type==='hero'?hero:slot.type==='villain'?villain:board)[slot.index];return <button key={value} disabled={used.has(value)&&value!==current} onClick={()=>setCard(value)} className={suit==='♥'||suit==='♦'?'red':''}>{value}</button>})}</div><button className="ghost-button" onClick={()=>setCard(null)}>Убрать карту</button></section></div>}
 </div>;
}
function ReplayLab({game,onBack}:{game:GameState;onBack:()=>void}){
 const replays=[...(game.replayArchive??[])].reverse().filter(item=>item.frames?.length>0);
 const [number,setNumber]=useState<number|null>(null),[index,setIndex]=useState(0);
 const replay:HandReplay|undefined=replays.find(item=>item.number===number)??replays[0];
 const frame=replay?.frames[Math.min(index,replay.frames.length-1)];
 const hero=frame?.players.find(player=>player.id==='hero');
 return <div className="lab-easy-screen">
  <LabHeading number="03" title="Посмотреть раздачу" onBack={onBack}/>
  <span className="eyebrow">ИСТОРИЯ</span><h1>Запись раздачи</h1>
  <p className="lab-easy-lead">Выбери раздачу, чтобы посмотреть её по шагам.</p>
  {replays.length===0?<div className="lab-empty"><strong>Пока нет раздач</strong><p>Когда сыграешь первую партию, здесь появятся её ходы.</p><button className="ghost-button" onClick={onBack}>К лаборатории</button></div>:<>
   <div className="lab-replay-picks" aria-label="Выбор раздачи">{replays.map(item=><button key={item.number} className={replay?.number===item.number?'active':''} onClick={()=>{setNumber(item.number);setIndex(0);}}>Раздача {item.number}</button>)}</div>
   {frame&&<><div className="lab-easy-replay-step"><strong>{frame.label}</strong><span>Шаг {index+1} из {replay.frames.length}</span></div>
    <div className="lab-easy-felt replay"><span>Банк: {money(frame.pot)}</span><div className="lab-compare-cards">{frame.board.map((card,i)=><LabCard key={i} value={card}/>)}</div><small>{frame.street==='preflop'?'Карты стола ещё не открыты':'Общие карты'}</small></div>
    <div className="lab-replay-me"><span>Твои карты</span><div className="lab-compare-cards">{hero?.cards.map((card,i)=><LabCard key={i} value={card}/>)}</div><span>Стек {money(hero?.stack??0)}</span></div>
    <div className="lab-replay-controls"><button disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))}>← Назад</button><button disabled={index>=replay.frames.length-1} onClick={()=>setIndex(i=>Math.min(replay.frames.length-1,i+1))}>Дальше →</button></div>
    <details className="lab-easy-details"><summary>Посмотреть всех игроков</summary><div className="lab-frame-players">{frame.players.map(player=><div key={player.id} className={player.folded?'folded':''}><b>{player.name}</b><span>Стек: {money(player.stack)} · ставка: {money(player.streetBet)}{player.folded?' · сбросил':''}</span><div className="lab-replay-cards">{player.cards.map((card,i)=><LabCard key={i} value={card}/>)}</div></div>)}</div></details>
   </>}
  </>}
  <p className="lab-disclaimer">История показывает сохранённые действия, а не оценивает их правильность. Скрытые карты соперников не раскрываются раньше вскрытия.</p>
 </div>;
}
export default function PokerLab({game,onBack}:{game:GameState;onBack:()=>void}){
 const [mode,setMode]=useState<Mode|null>(null);
 if(mode==='odds')return <div className="poker-lab lab-easy-root"><OddsLab onBack={()=>setMode(null)}/></div>;
 if(mode==='cards')return <div className="poker-lab lab-easy-root"><CardsLab onBack={()=>setMode(null)}/></div>;
 if(mode==='replay')return <div className="poker-lab lab-easy-root"><ReplayLab game={game} onBack={()=>setMode(null)}/></div>;
 return <div className="poker-lab lab-easy-root">
  <div className="lab-easy-heading"><button className="icon-button" aria-label="Назад к обучению" onClick={onBack}>←</button><strong>Эксперименты</strong><span>POCKET</span></div>
  <div className="lab-hub-intro"><span className="eyebrow">ПРАКТИКА</span><h1>Лаборатория</h1><p>Выбери инструмент.</p></div>
  <div className="lab-hub-grid">
   <button onClick={()=>setMode('cards')}><span className="lab-hub-icon cards">A♠</span><span><small>01 / КАРТЫ</small><strong>Комбинации</strong><em>Составление и сравнение комбинаций.</em></span><b>→</b></button>
   <button onClick={()=>setMode('odds')}><span className="lab-hub-icon odds">◉</span><span><small>02 / СТАВКИ</small><strong>Ставки и шансы</strong><em>Расчёт шансов банка при разных ставках.</em></span><b>→</b></button>
   <button onClick={()=>setMode('replay')}><span className="lab-hub-icon replay">↺</span><span><small>03 / ТВОЯ ИГРА</small><strong>Повторить раздачу</strong><em>Просмотр сохранённых раздач.</em></span><b>→</b></button>
  </div>
  
 </div>;
}
