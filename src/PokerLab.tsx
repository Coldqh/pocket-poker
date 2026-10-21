import {useState} from 'react';
import type {GameState,HandReplay} from './engine';
import {chanceToImprove,compareBuiltHands,evaluateBuiltHand,LAB_CARD_OPTIONS,potOddsRequired,simplifiedCallEV} from './lab';

type Mode='odds'|'cards'|'replay';
type Guess='call'|'fold';
const SITUATIONS=[
 {title:'За флешем',pot:120,bet:60,outs:9,draws:1 as const,description:'У тебя почти флеш. Одна карта ещё придёт. Девять карт из оставшихся гарантированно принесут победу.'},
 {title:'Выгодная цена?',pot:100,bet:20,outs:12,draws:1 as const,description:'Соперник поставил немного. Двенадцать карт сделают твою руку победной.'},
 {title:'Две попытки',pot:200,bet:100,outs:8,draws:2 as const,description:'До конца раздачи откроются ещё две карты. Восемь из них гарантированно помогут победить.'}
];
const suits=['♠','♥','♦','♣'] as const;
const ranks=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
const pct=(n:number)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n*100)+'%';
const money=(n:number)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(n);
function LabCard({value,onClick}:{value:string|null;onClick?:()=>void}){
 return <button type="button" className={'lab-card '+(value?.includes('♥')||value?.includes('♦')?'red ':'')+(!value?'empty':'')} onClick={onClick} disabled={!onClick} aria-label={value?'Карта '+value:'Выбрать карту'}>{value??'+'}</button>;
}
function LabHeading({number,title,onBack}:{number:string;title:string;onBack:()=>void}){
 return <div className="lab-easy-heading"><button className="icon-button" aria-label="Назад к инструментам" onClick={onBack}>←</button><strong>{title}</strong><span>{number} / 03</span></div>;
}
function RangeControl({title,value,min,max,step=1,onChange}:{title:string;value:number;min:number;max:number;step?:number;onChange:(n:number)=>void}){
 return <label className="lab-range"><span className="lab-range-label"><strong>{title}</strong><b>{value}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
function OddsLab({onBack}:{onBack:()=>void}){
 const [task,setTask]=useState(0),[guess,setGuess]=useState<Guess|null>(null);
 const [edit,setEdit]=useState(false);
 const situation=SITUATIONS[task];
 const [pot,setPot]=useState(situation.pot),[bet,setBet]=useState(situation.bet),[outs,setOuts]=useState(situation.outs),[draws,setDraws]=useState<1|2>(situation.draws);
 const needed=potOddsRequired(pot,bet);
 const chance=chanceToImprove(outs,draws===1?46:47,draws);
 const correct:Guess=chance>=needed?'call':'fold';
 const ev=simplifiedCallEV(pot,bet,chance);
 const next=()=>{
   const number=(task+1)%SITUATIONS.length;
   const upcoming=SITUATIONS[number];
   setTask(number);setPot(upcoming.pot);setBet(upcoming.bet);setOuts(upcoming.outs);setDraws(upcoming.draws);setGuess(null);setEdit(false);
 };
 return <div className="lab-easy-screen">
  <LabHeading number="01" title="Ответить или сбросить?" onBack={onBack}/>
  <div className="lab-easy-progress"><span style={{width:((task+1)/SITUATIONS.length*100)+'%'}}/></div>
  <span className="eyebrow">ЗАДАЧА {task+1} / {SITUATIONS.length}</span>
  <h1>{situation.title}</h1><p className="lab-easy-lead">{situation.description}</p>
  <div className="lab-easy-felt">
   <span>Банк был {money(pot)}. Соперник ставит {money(bet)}.</span>
   <div className="lab-pot-art" aria-hidden="true"><span/><span/><span/><span/><span/></div>
   <div className="lab-situation-number">{money(pot+bet)} <small>в банке сейчас</small></div>
   <div className="lab-easy-price">Тебе нужно добавить <b>{money(bet)}</b></div>
  </div>
  <h2 className="lab-easy-question">Что выберешь?</h2>
  <div className="lab-easy-choices">
   <button disabled={guess!==null} onClick={()=>setGuess('fold')} className={guess==='fold'?'chosen':''}>Сбросить карты <small>Фолд</small></button>
   <button disabled={guess!==null} onClick={()=>setGuess('call')} className={guess==='call'?'chosen':''}>Ответить на ставку <small>Колл {money(bet)}</small></button>
  </div>
  {guess!==null&&<section className="lab-easy-feedback" aria-live="polite">
   <span className="eyebrow">{guess===correct?'ТАК И ЕСТЬ':'ВОТ ПОЧЕМУ'}</span>
   <h2>{correct==='call'?'Здесь ответить выгодно':'Здесь лучше сбросить'}</h2>
   <p>В этой учебной ситуации ты можешь выиграть примерно с вероятностью <b>{pct(chance)}</b>. Для выгодного колла нужно хотя бы <b>{pct(needed)}</b>.</p>
   <div className="lab-easy-mathbar"><span style={{width:(needed*100)+'%'}}/><i style={{left:(chance*100)+'%'}}/></div>
   <div className="lab-easy-mathlegend"><span>Порог: {pct(needed)}</span><span>Твой шанс: {pct(chance)}</span></div>
   <details className="lab-easy-details"><summary>Почему это работает?</summary><p>Считаем по упрощённым правилам: все указанные карты гарантированно выигрывают, остальные проигрывают. Ничьих и дополнительных ставок нет.{draws===2?' Ты бесплатно увидишь обе следующие карты.':''} Это не оценка эквити настоящей раздачи. Условная прибыль колла по модели: {ev>=0?'+':''}{money(ev)}.</p></details>
   <button className="big-primary" onClick={next}>Ещё одна ситуация →</button>
  </section>}
  <details className="lab-easy-expert" open={edit} onToggle={e=>setEdit(e.currentTarget.open)}><summary>Хочу поменять цифры</summary>
   <p>Это эксперимент. Меняй условия и смотри, как изменится ответ.</p>
   <div className="lab-easy-sliders"><RangeControl title="Банк до ставки" min={20} max={1000} step={10} value={pot} onChange={n=>{setPot(n);setGuess(null);}}/><RangeControl title="Ставка" min={5} max={500} step={5} value={bet} onChange={n=>{setBet(n);setGuess(null);}}/><RangeControl title="Выигрышные карты" min={0} max={20} value={outs} onChange={n=>{setOuts(n);setGuess(null);}}/><div className="lab-easy-toggle"><strong>Осталось карт</strong><button className={draws===1?'active':''} onClick={()=>{setDraws(1);setGuess(null);}}>Одна</button><button className={draws===2?'active':''} onClick={()=>{setDraws(2);setGuess(null);}}>Две</button></div></div>
  </details>
 </div>;
}
function CardsLab({onBack}:{onBack:()=>void}){
 const [hero,setHero]=useState<(string|null)[]>(['A♠','K♠']);
 const [villain,setVillain]=useState<(string|null)[]>(['Q♥','Q♦']);
 const [board,setBoard]=useState<(string|null)[]>(['2♠','7♠','J♦','9♣','3♥']);
 const [guess,setGuess]=useState<'hero'|'villain'|'tie'|null>(null);
 const [editing,setEditing]=useState(false);
 const [slot,setSlot]=useState<{type:'hero'|'villain'|'board';index:number}|null>(null);
 const [suit,setSuit]=useState<typeof suits[number]>('♠');
 const used=new Set([...hero,...villain,...board].filter((x):x is string=>x!==null));
 const complete=(cards:(string|null)[])=>cards.every(v=>v!==null)?cards as string[]:null;
 const ready=complete(hero)&&complete(villain)&&complete(board);
 const result=ready?compareBuiltHands(complete(hero)!,complete(villain)!,complete(board)!):null;
 const winning=result===null?null:result===0?'tie':result>0?'hero':'villain';
 const heroName=complete(hero)?evaluateBuiltHand(complete(hero)!,board.filter((x):x is string=>x!==null)):null;
 const villainName=complete(villain)?evaluateBuiltHand(complete(villain)!,board.filter((x):x is string=>x!==null)):null;
 const replaceCard=(value:string|null)=>{
  if(!slot)return;
  const change=(cards:(string|null)[])=>cards.map((old,i)=>slot.index===i?value:old);
  if(slot.type==='hero')setHero(change);
  else if(slot.type==='villain')setVillain(change);
  else setBoard(change);
  setGuess(null);setSlot(null);
 };
 const next=()=>{
  const arr=[...LAB_CARD_OPTIONS];
  for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
  setHero(arr.slice(0,2));setVillain(arr.slice(2,4));setBoard(arr.slice(4,9));setGuess(null);
 };
 const makeCards=(cards:(string|null)[],type:'hero'|'villain'|'board')=>cards.map((value,i)=><LabCard key={type+i} value={value} onClick={editing?()=>setSlot({type,index:i}):undefined}/>);
 return <div className="lab-easy-screen">
  <LabHeading number="02" title="Чья рука сильнее?" onBack={onBack}/>
  <span className="eyebrow">СРАВНИ КАРТЫ</span><h1>Кто заберёт банк?</h1>
  <p className="lab-easy-lead">Посмотри на карты игроков и пять карт на столе. Выбери победителя.</p>
  <div className="lab-compare-hands"><div><span>ТЫ</span><div className="lab-compare-cards">{makeCards(hero,'hero')}</div></div><div><span>СОПЕРНИК</span><div className="lab-compare-cards">{makeCards(villain,'villain')}</div></div></div>
  <div className="lab-compare-board"><span>НА СТОЛЕ</span><div className="lab-compare-cards">{makeCards(board,'board')}</div></div>
  <div className="lab-easy-choices three">
   <button disabled={guess!==null||!ready} className={guess==='hero'?'chosen':''} onClick={()=>setGuess('hero')}>Ты</button>
   <button disabled={guess!==null||!ready} className={guess==='villain'?'chosen':''} onClick={()=>setGuess('villain')}>Соперник</button>
   <button disabled={guess!==null||!ready} className={guess==='tie'?'chosen':''} onClick={()=>setGuess('tie')}>Ничья</button>
  </div>
  {!ready&&<p className="lab-easy-lead">Добавь все карты, чтобы сравнить готовые комбинации.</p>}
  {guess!==null&&<section className="lab-easy-feedback" aria-live="polite"><span className="eyebrow">{guess===winning?'ПРАВИЛЬНО':'ДАВАЙ РАЗБЕРЁМ'}</span><h2>{winning==='hero'?'Твои карты выигрывают':winning==='villain'?'Выигрывает соперник':'Банк делится поровну'}</h2><p>У тебя: <b>{heroName??'—'}</b>. У соперника: <b>{villainName??'—'}</b>. Сравниваем лучшие пять карт каждого игрока.</p><button className="big-primary" onClick={next}>Другая раздача →</button></section>}
  <button className="lab-easy-edit-toggle" aria-pressed={editing} onClick={()=>{setEditing(v=>!v);setGuess(null);}}>{editing?'Завершить выбор карт':'Хочу составить свои карты'}</button>
  {editing&&<p className="lab-easy-lead">Нажми на любую карту, чтобы её заменить. Повторяющиеся карты недоступны.</p>}
  {slot&&<div className="sheet-scrim lab-picker-scrim" onClick={()=>setSlot(null)}><section className="bottom-sheet lab-picker" role="dialog" aria-modal="true" aria-label="Выбор карты" onClick={e=>e.stopPropagation()}><div className="sheet-head"><h2>Выбери карту</h2><button className="icon-button" onClick={()=>setSlot(null)} aria-label="Закрыть">×</button></div><div className="lab-suit-picker">{suits.map(value=><button key={value} className={suit===value?'active':''} onClick={()=>setSuit(value)}>{value}</button>)}</div><div className="lab-rank-picker">{ranks.map(rank=>{const card=rank+suit;const current=(slot.type==='hero'?hero:slot.type==='villain'?villain:board)[slot.index];return <button key={card} disabled={used.has(card)&&current!==card} onClick={()=>replaceCard(card)} className={suit==='♥'||suit==='♦'?'red':''}>{card}</button>;})}</div><button className="ghost-button" onClick={()=>replaceCard(null)}>Убрать карту</button></section></div>}
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
  <span className="eyebrow">ТВОЯ ИСТОРИЯ</span><h1>Как всё было?</h1>
  <p className="lab-easy-lead">Листай уже сыгранные раздачи и смотри, как менялись карты и банк.</p>
  {replays.length===0?<div className="lab-empty"><strong>Пока нет раздач</strong><p>Когда сыграешь первую партию, здесь появятся её ходы.</p><button className="ghost-button" onClick={onBack}>К экспериментам</button></div>:<>
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
  <div className="lab-hub-intro"><span className="eyebrow">ПОПРОБУЙ САМ</span><h1>Покер без сложных формул.</h1><p>Выбери одну из трёх простых игр. Все объяснения появятся после твоего действия.</p></div>
  <div className="lab-hub-grid">
   <button onClick={()=>setMode('cards')}><span className="lab-hub-icon cards">A♠</span><span><small>01 / КАРТЫ</small><strong>Кто выиграл?</strong><em>Сравни две руки и выбери победителя.</em></span><b>→</b></button>
   <button onClick={()=>setMode('odds')}><span className="lab-hub-icon odds">◉</span><span><small>02 / СТАВКИ</small><strong>Ответить или сбросить?</strong><em>Попробуй решение, а потом посмотри расчёт.</em></span><b>→</b></button>
   <button onClick={()=>setMode('replay')}><span className="lab-hub-icon replay">↺</span><span><small>03 / ТВОЯ ИГРА</small><strong>Повторить раздачу</strong><em>Вспомни, что происходило за столом.</em></span><b>→</b></button>
  </div>
  <p className="lab-hub-footnote">Никаких обязательных тестов и оценок. Можно просто экспериментировать.</p>
 </div>;
}
