import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, type CSSProperties } from 'react';
import { act, amountToCall, botMove, cardText, maxRaiseTo, minRaiseTo, potFractionRaiseTo, newMatch, nextHand, hydrateGameChips, exchangeForBet, exchangePlayerChip, BOT_STYLES, SITNGO_HANDS_PER_LEVEL, type GameFormat, type BotDifficulty, type HandReplay, type Card, type GameState } from './engine';
import { modules, type Module } from './lessons';
import PokerLab from './PokerLab';
import { breakdownChips, canPayChips, DEFAULT_STARTING_CHIPS, CHIP_DENOMINATIONS, copyInventory, chipInventoryTotal, validStartingChips, inventoryGroups, paymentChipGroups, type ChipInventory, type ChipGroup } from './chips';

type Page = 'home' | 'play' | 'academy' | 'stats';
type Profile = { configured: boolean; experience: 'new' | 'some' | 'confident'; known: string[]; focus: string[] };
type Progress = { completed: string[]; attempts: Record<string, {correct:number; total:number}> };
type CareerResult = {id:string;place:number;players:number;points:number;completedAt:number};
type Session = { moduleId: string | null; phase: 'theory' | 'practice' | 'finished'; index: number; choice: number | null; correct: number; theoryIndex?: number };
const GAME_KEY = 'pocket-v2-game';
const PROFILE_KEY = 'pocket-v2-profile';
const PROGRESS_KEY = 'pocket-v2-progress';
const PAGE_KEY = 'pocket-v3-page';
const SESSION_KEY = 'pocket-v3-study';
const READY_KEY = 'pocket-v6-table-ready';
const CAREER_KEY = 'pocket-v9-career';
const emptyProfile:Profile = {configured:false,experience:'new',known:[],focus:[]};
const emptyProgress:Progress = {completed:[],attempts:{}};
const emptySession:Session = {moduleId:null,phase:'theory',index:0,choice:null,correct:0,theoryIndex:0};
const money = (n:number) => n.toLocaleString('ru-RU');
const playerCountLabel = (n:number) => `${n} ${n===2?'игрока':'игроков'}`;
const streetName:Record<string,string> = {preflop:'Префлоп',flop:'Флоп',turn:'Тёрн',river:'Ривер',showdown:'Вскрытие'};
type ChipSize = 'mini' | 'small' | 'large' | 'bet';
/** Each denomination is visible as a stacked set of physical-looking discs;
 * the integer badge shows the FULL count, even with a tall stack. */
function ChipStack({value,count,size}:{value:ChipGroup['value'];count:number;size:ChipSize}){
  return <div className={`denomination denomination-${size}`} aria-label={`${count} фишек по ${value}`}>
    <div className="chip-tower" aria-hidden="true">
      {Array.from({length:Math.min(count,5)},(_,i)=><span key={i} className={`casino-chip casino-chip-${value}`} style={{'--layer':i} as CSSProperties}/>)}
    </div>
    <span className="chip-tally"><b>{count}</b><span>×{value}</span></span>
  </div>;
}
function ChipRack({amount,size='small',maxGroups=5,groups}:{amount:number;size?:ChipSize;maxGroups?:number;groups?:ChipGroup[]}){
  const breakdown=groups??breakdownChips(amount);
  const visible=breakdown.slice(0,maxGroups);
  const hidden=breakdown.slice(maxGroups);
  const summary=breakdown.map(({value,count})=>`${count} по ${value}`).join(', ') || 'фишек нет';
  return <div className={`chip-rack chip-rack-${size}`} role="img" aria-label={`Всего ${amount}: ${summary}`} title={summary}>
    {visible.length?visible.map(({value,count})=><ChipStack key={value} value={value} count={count} size={size}/>):<span className="chips-empty">0</span>}
    {hidden.length>0&&<span className="extra-denoms">+{hidden.length}</span>}
  </div>;
}
const load = <T,>(key:string,fallback:T):T => {try {const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}};
function loadGame():GameState {
  const s=load<GameState|null>(GAME_KEY,null);
  if(s && Array.isArray(s.order) && s.order.length>=2 && s.order.length<=6 && s.order.includes('hero') &&
    s.players?.hero && Array.isArray(s.deck) && s.opponentCount>=1 && s.opponentCount<=5 &&
    s.order.every(id=>s.players[id] && Array.isArray(s.players[id].hand) && typeof s.players[id].contributed==='number')) return hydrateGameChips(s);
  return newMatch(1);
}
function loadProfile():Profile {const p=load(PROFILE_KEY,emptyProfile);return p && Array.isArray(p.known) && Array.isArray(p.focus)?p:emptyProfile;}
function loadProgress():Progress {const p=load(PROGRESS_KEY,emptyProgress);return p && Array.isArray(p.completed) && p.attempts?p:emptyProgress;}
function loadStarted():boolean {return load<boolean>(READY_KEY,false)||!!load<GameState|null>(GAME_KEY,null)?.handsFinished;}
function loadPage():Page {const p=load<Page>(PAGE_KEY,'home');return ['home','play','academy','stats'].includes(p)?p:'home';}
function loadSession():Session {const s=load(SESSION_KEY,emptySession);return s && (s.moduleId===null || modules.some(m=>m.id===s.moduleId)) && ['theory','practice','finished'].includes(s.phase)?s:emptySession;}

function Icon({name,size=22}:{name:string;size?:number}) {
  const common={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
  switch(name){
    case 'home':return <svg {...common}><path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/></svg>;
    case 'book':return <svg {...common}><path d="M12 6c-2.4-1.9-5.3-2.2-9-1.5v15c3.6-.7 6.7-.3 9 1.5 2.3-1.8 5.4-2.2 9-1.5v-15c-3.7-.7-6.6-.4-9 1.5Zm0 0v15"/></svg>;
    case 'stats':return <svg {...common}><path d="M4 20V11m5 9V6m5 14v-8m5 8V3"/></svg>;
    case 'settings':return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M4 11V9l2-1 1-2 2-2h2l1-2h2l1 2h2l2 2 1 2 2 1v4l-2 1-1 2-2 2h-2l-1 2h-2l-1-2H9l-2-2-1-2-2-1z"/></svg>;
    case 'back':return <svg {...common}><path d="m15 5-7 7 7 7"/></svg>;
    case 'chevron':return <svg {...common}><path d="m9 5 7 7-7 7"/></svg>;
    case 'close':return <svg {...common}><path d="m5 5 14 14M19 5 5 19"/></svg>;
    case 'history':return <svg {...common}><path d="M3 9a9 9 0 1 1 0 6M3 4v5h5m4-3v6l4 2"/></svg>;
    default:return <svg {...common}><path d="M12 2c2.2 4.5 8 7 8 12a8 8 0 0 1-16 0c0-5 5.8-7.5 8-12Z"/><path d="M12 13v8"/></svg>;
  }
}
function CardFace({card,hidden=false,small=false}:{card?:Card;hidden?:boolean;small?:boolean}){
  const red=card?.suit==='♥'||card?.suit==='♦';
  return <div className={`card-face ${small?'card-small':''} ${hidden?'card-back':''} ${!card&&!hidden?'card-empty':''} ${red?'red':''}`} aria-label={hidden?'Закрытая карта':card?cardText(card):'Место для карты'}>
    {!hidden&&card?<><span>{cardText(card)}</span><b>{card.suit}</b></>:hidden?<span className="back-pattern">P</span>:null}
  </div>;
}
function ScenarioFace({value}:{value:string}){return <div className={`card-face scenario-face ${value.includes('♥')||value.includes('♦')?'red':''}`}><span>{value}</span><b>{value.slice(-1)}</b></div>;}
function TabBar({page,onChange}:{page:Page;onChange:(page:Page)=>void}){
  const tabs:{key:Page;label:string;icon:string}[]=[{key:'home',label:'Главная',icon:'home'},{key:'play',label:'Играть',icon:'spade'},{key:'academy',label:'Учёба',icon:'book'}];
  return <nav className="tabbar" aria-label="Основные разделы">{tabs.map(tab=><button key={tab.key} aria-current={page===tab.key?'page':undefined} className={page===tab.key?'active':''} onClick={()=>onChange(tab.key)}><Icon name={tab.icon}/><span>{tab.label}</span></button>)}</nav>;
}
function Header({page,onChange}:{page:Page;onChange:(page:Page)=>void}){
  return <header className="app-header"><button className="wordmark" onClick={()=>onChange('home')} aria-label="На главную">pocket<span>.</span></button><button className={`header-icon ${page==='stats'?'selected':''}`} title="Прогресс" aria-label="Прогресс" onClick={()=>onChange('stats')}><Icon name="stats"/></button></header>;
}
function Home({game,onChange}:{game:GameState;onChange:(page:Page)=>void}){
  return <section className="home-screen home-minimal">
    <button className="resume-tile" onClick={()=>onChange('play')}>
      <div className="resume-content"><span className="resume-tag">TEXAS HOLD’EM</span>
        <h2>{game.handsFinished||game.handNumber>1?'Вернуться за стол':'Играть в покер'}</h2>
        <span>{playerCountLabel(game.opponentCount+1)} · {game.smallBlind}/{game.bigBlind} · Раздача {game.handNumber}</span>
      </div>
      <div className="resume-art" aria-hidden="true"><div className="resume-card first">A<span>♠</span></div><div className="resume-card second">K<span>♥</span></div></div>
      <span className="resume-cta">Играть <Icon name="chevron" size={18}/></span>
    </button>
  </section>;
}
const seatCoords:Record<number,{x:number;y:number}[]>={
  1:[{x:50,y:12}],
  2:[{x:27,y:14},{x:73,y:14}],
  3:[{x:16,y:31},{x:50,y:10},{x:84,y:31}],
  4:[{x:15,y:34},{x:34,y:9},{x:66,y:9},{x:85,y:34}],
  5:[{x:11,y:44},{x:25,y:13},{x:50,y:7},{x:75,y:13},{x:89,y:44}]
};
function betCoordinates(seat:{x:number;y:number}){
  return {x:seat.x+(50-seat.x)*.37,y:seat.y+(53-seat.y)*.35};
}
function Opponent({game,id,seat,action,onInspect}:{game:GameState;id:string;seat:{x:number;y:number};action?:string;onInspect:(id:string)=>void}){
  const p=game.players[id];const out=p.stack===0&&p.hand.length===0;
  return <div className={`table-opponent ${game.actor===id?'acting':''} ${p.folded||out?'folded':''}`} style={{'--seat-x':`${seat.x}%`,'--seat-y':`${seat.y}%`} as CSSProperties}>
    <span className="opponent-avatar">{p.name.slice(0,1)}</span><strong>{p.name}{game.button===id?' · D':''}</strong>
    <button className="opponent-bankroll" onClick={()=>onInspect(id)} aria-label={`Фишки ${p.name}: ${money(p.stack)}, показать по номиналам`}>
      <span className="opponent-stack">{out?'Выбыл':money(p.stack)}</span>
      {!out&&<ChipRack amount={p.stack} groups={inventoryGroups(p.chips)} size="mini" maxGroups={2}/>}
    </button>
    {p.hand.length>0&&!p.folded&&<div className="opponent-cards">{p.hand.map((c,i)=><CardFace key={`${game.handNumber}-${i}`} card={c} small hidden={!game.revealBot||p.folded}/>)}</div>}
    {action&&<span key={action} className="seat-action opponent-action">{action}</span>}
  </div>;
}

const TABLE_PRESETS:{name:string;desc:string;chips:ChipInventory}[]=[
  {name:'Стандарт',desc:'1 000 фишек',chips:DEFAULT_STARTING_CHIPS},
  {name:'Глубокий',desc:'2 000 фишек',chips:{500:2,100:6,25:12,5:16,1:20}},
  {name:'Крупный стек',desc:'5 000 фишек',chips:{500:7,100:9,25:18,5:26,1:20}}
];

function TableSetup({defaultSeats,defaultChips,defaultBlind,defaultDifficulty,defaultFormat,onStart,onExit}:{defaultSeats:number;defaultChips:ChipInventory;defaultBlind:number;defaultDifficulty:BotDifficulty;defaultFormat:GameFormat;onStart:(seats:number,chips:ChipInventory,blind:number,difficulty:BotDifficulty,format:GameFormat)=>void;onExit:()=>void}){
  const [seats,setSeats]=useState(defaultSeats);
  const [format,setFormat]=useState<GameFormat>(defaultFormat);
  const [blind,setBlind]=useState(defaultBlind);
  const [difficulty,setDifficulty]=useState<BotDifficulty>(defaultDifficulty);
  const [chips,setChips]=useState<ChipInventory>(()=>copyInventory(validStartingChips(defaultChips)?defaultChips:DEFAULT_STARTING_CHIPS));
  const [editChips,setEditChips]=useState(false);
  const total=chipInventoryTotal(chips),valid=validStartingChips(chips);
  const change=(value:typeof CHIP_DENOMINATIONS[number],delta:number)=>setChips(old=>({...old,[value]:Math.min(200,Math.max(0,old[value]+delta))}));
  const matching=TABLE_PRESETS.find(p=>CHIP_DENOMINATIONS.every(v=>chips[v]===p.chips[v]));
  return <section className="table-setup setup-compact">
    <div className="study-header"><button className="icon-button" onClick={onExit} aria-label="Назад"><Icon name="back"/></button><strong>Новый стол</strong><span className="small-muted">Только фишки</span></div>
    <div className="setup-main">
      <div className="setup-compact-modes" role="group" aria-label="Режим игры">
        <button className={format==='practice'?'active':''} aria-pressed={format==='practice'} onClick={()=>setFormat('practice')}>Свободная игра</button>
        <button className={format==='sitngo'?'active':''} aria-pressed={format==='sitngo'} onClick={()=>setFormat('sitngo')}>Sit & Go</button>
      </div>
      <div className="setup-compact-row"><span>Соперники</span><div className="setup-seats">{[1,2,3,4,5].map(n=><button key={n} aria-label={`${n} соперников`} aria-pressed={seats===n} className={seats===n?'active':''} onClick={()=>setSeats(n)}>{n}</button>)}</div></div>
      <div className="setup-compact-row"><span>{format==='sitngo'?'Начальные блайнды':'Блайнды'}</span><div className="setup-rule-grid">{[4,10,20,50].map(n=><button key={n} aria-pressed={blind===n} className={blind===n?'active':''} onClick={()=>setBlind(n)}>{n/2}/{n}</button>)}</div></div>
      <div className="setup-compact-row"><span>Боты</span><div className="setup-rule-grid bot-rule-grid">{([['easy','Легко'],['normal','Обычно'],['hard','Сложно']] as const).map(([id,title])=><button key={id} className={difficulty===id?'active':''} aria-pressed={difficulty===id} onClick={()=>setDifficulty(id)}>{title}</button>)}</div></div>
      <div className="setup-stack-summary">
        <div><span>Стартовый стек</span><strong>{money(total)}</strong><small>{matching?.name??'Свой набор'} · 1 / 5 / 25 / 100 / 500</small></div>
        <button onClick={()=>setEditChips(true)}>Настроить фишки <Icon name="chevron" size={16}/></button>
      </div>
      {format==='sitngo'&&<p className="setup-mode-hint">Рост блайндов каждые {SITNGO_HANDS_PER_LEVEL} раздачи · выбывание · учебные очки</p>}
      {!valid&&<p className="setup-error">Стартовый стек: от 200 до 20 000 фишек.</p>}
    </div>
    <div className="setup-fixed-footer"><button className="big-primary" disabled={!valid} onClick={()=>onStart(seats,chips,blind,difficulty,format)}>{format==='sitngo'?'Начать турнир':'Играть'} <Icon name="chevron" size={18}/></button></div>
    {editChips&&<div className="sheet-scrim setup-chip-scrim" onClick={()=>setEditChips(false)}><section className="bottom-sheet setup-chip-sheet" role="dialog" aria-modal="true" aria-label="Настройка количества фишек" onClick={e=>e.stopPropagation()}>
      <div className="sheet-head"><h2>Фишки</h2><button className="icon-button" autoFocus onClick={()=>setEditChips(false)} aria-label="Закрыть"><Icon name="close"/></button></div>
      <div className="setup-presets">{TABLE_PRESETS.map(p=><button key={p.name} className={CHIP_DENOMINATIONS.every(value=>chips[value]===p.chips[value])?'chosen':''} onClick={()=>setChips(copyInventory(p.chips))}><strong>{p.name}</strong><small>{p.desc}</small></button>)}</div>
      <div className="setup-inventory">{CHIP_DENOMINATIONS.map(value=><div className="setup-denom" key={value}>
        <ChipStack value={value} count={chips[value]} size="large"/>
        <div className="setup-denom-name"><strong>{value}</strong><small>Номинал</small></div>
        <div className="setup-counter"><button disabled={chips[value]===0} onClick={()=>change(value,-1)} aria-label={`Убрать фишку ${value}`}>−</button><span>{chips[value]}</span><button disabled={chips[value]===200} onClick={()=>change(value,1)} aria-label={`Добавить фишку ${value}`}>+</button></div>
      </div>)}</div>
      <div className="chip-editor-footer"><span>Всего <strong>{money(total)}</strong></span><button className="big-primary" disabled={!valid} onClick={()=>setEditChips(false)}>Готово</button></div>
    </section></div>}
  </section>;
}
function GameTable({game,setGame,onExit,onNewTable}:{game:GameState;setGame:Dispatch<SetStateAction<GameState>>;onExit:()=>void;onNewTable:()=>void}){
  const [sheet,setSheet]=useState<'settings'|'history'|null>(null);
  const [replayNumber,setReplayNumber]=useState<number|null>(null);
  const [replayIndex,setReplayIndex]=useState(0);
  const [raiseOpen,setRaiseOpen]=useState(false);
  const [raise,setRaise]=useState(40);
  const [speed,setSpeed]=useState<'normal'|'fast'>(()=>load<'normal'|'fast'>('pocket-v4-speed','normal')==='fast'?'fast':'normal');
  const [notice,setNotice]=useState<{seq:number;player:string;message:string}|null>(null);
  type ChipFlight = {key:string;from:{x:number;y:number};to:{x:number;y:number};kind:'bet'|'collect'|'award'};
  const [flights,setFlights]=useState<ChipFlight[]>([]);
  const [foldFlights,setFoldFlights]=useState<{key:number;x:number;y:number}[]>([]);
  const [inspected,setInspected]=useState<string|null>(null);
  const motionKey=useRef(0);
  const previousGame=useRef(game);
  useEffect(()=>{try{localStorage.setItem('pocket-v4-speed',JSON.stringify(speed));}catch{}},[speed]);
  useEffect(()=>{
    const previous=previousGame.current;
    previousGame.current=game;
    if(game.handNumber!==previous.handNumber)return;
    const opponents=game.order.filter(id=>id!=='hero');
    const folded=game.order.filter(id=>!previous.players[id].folded&&game.players[id].folded&&previous.players[id].hand.length===2);
    if(folded.length)setFoldFlights(items=>[...items,...folded.map(id=>{
      const coord=id==='hero'?{x:50,y:84}:seatCoords[game.opponentCount][opponents.indexOf(id)];
      return {key:++motionKey.current,x:coord.x,y:coord.y};
    })]);
    if(game.history[0]!==previous.history[0]) {
      const event=game.history.find(item=>/ · (?:фолд|колл|рейз|чек)(?: |$)/.test(item));
      if(event){
        const [name,message]=event.split(' · ');
        const id=game.order.find(playerId=>game.players[playerId].name===name);
        setNotice({seq:Date.now(),player:id??'hero',message});
      }
    }
    const seats=game.order.filter(id=>id!=='hero');
    const coord=(id:string)=>id==='hero'?{x:50,y:84}:seatCoords[game.opponentCount][seats.indexOf(id)];
    const motions:ChipFlight[]=[];
    const add=(from:{x:number;y:number},to:{x:number;y:number},kind:ChipFlight['kind'])=>motions.push({key:`${++motionKey.current}`,from,to,kind});
    if(game.result&&!previous.result&&previous.pot>0){
      const winners=game.order.filter(id=>game.players[id].stack>previous.players[id].stack);
      const targets=winners.length?winners:[game.result.startsWith('Ты')?'hero':seats[0]];
      targets.forEach(id=>add({x:50,y:48},coord(id),'award'));
    } else if(game.street!==previous.street && game.pot>0){
      previous.order.forEach(id=>{
        if(previous.players[id].streetBet>0)add(betCoordinates(coord(id)),{x:50,y:44},'collect');
      });
    } else if(game.pot>previous.pot){
      game.order.forEach(id=>{
        if(game.players[id].streetBet>previous.players[id].streetBet)add(coord(id),betCoordinates(coord(id)),'bet');
      });
    }
    if(motions.length)setFlights(motions);
  },[game]);
  useEffect(()=>{
    if(!flights.length)return;
    const timeout=window.setTimeout(()=>setFlights([]),speed==='fast'?420:880);
    return ()=>window.clearTimeout(timeout);
  },[flights,speed]);
  useEffect(()=>{
    if(!notice)return;
    const timeout=window.setTimeout(()=>setNotice(value=>value?.seq===notice.seq?null:value),speed==='fast'?480:1050);
    return ()=>window.clearTimeout(timeout);
  },[notice,speed]);
  useEffect(()=>{
    if(!foldFlights.length)return;
    const timer=window.setTimeout(()=>setFoldFlights([]),speed==='fast'?360:780);
    return ()=>window.clearTimeout(timer);
  },[foldFlights,speed]);
  const archive:HandReplay[]=useMemo(()=>[...((game.replayArchive??[]).filter(x=>x.frames?.length)??[])].reverse(),[game.replayArchive]);
  const activeReplays:HandReplay[]=game.result?archive:[{number:game.handNumber,result:'Раздача идёт',frames:game.replayFrames??[]},...archive];
  const replay=activeReplays.find(x=>x.number===replayNumber)??activeReplays[0];
  const frame=replay?.frames[Math.min(replayIndex,(replay.frames.length||1)-1)];
  const hero=game.players.hero;
  const onStreet=chipInventoryTotal(game.potChips);
  const toCall=amountToCall(game,'hero');
  const minRaise=Math.min(minRaiseTo(game),maxRaiseTo(game,'hero'));
  const maxRaise=maxRaiseTo(game,'hero');
  const boundedRaise=Math.min(maxRaise,Math.max(minRaise,Math.floor(raise || minRaise)));
  const canRaise=maxRaise>game.currentBet&&maxRaise>hero.streetBet;
  const heroTurn=game.actor==='hero'&&!game.result;
  const canCallWithChips=canPayChips(hero.chips,toCall);
  const raiseContribution=Math.max(0,boundedRaise-hero.streetBet);
  const canRaiseWithChips=canPayChips(hero.chips,raiseContribution);
  useEffect(()=>{setRaise(minRaise);setRaiseOpen(false);},[game.handNumber,game.street,game.currentBet,minRaise]);
  useEffect(()=>{
    if(!game.actor||game.actor==='hero'||game.result)return;
    const id=game.actor;const timeout=setTimeout(()=>setGame(s=>s.actor===id?act(s,id,botMove(s,id)):s),speed==='fast'?140:650);
    return ()=>clearTimeout(timeout);
  },[game,setGame,speed]);
  const submit=(kind:'fold'|'call'|'check'|'raise')=>{
    if(kind==='call'&&!canCallWithChips)return;
    if(kind==='raise'&&!canRaiseWithChips)return;
    setGame(s=>act(s,'hero',{kind,to:kind==='raise'?boundedRaise:undefined}));setRaiseOpen(false);
  };
  const startNew=()=>{setSheet(null);setRaiseOpen(false);onNewTable();};
  return <section className={`game-screen motion-${speed}`}>
    <div className="game-toolbar"><button aria-label="Вернуться на главную" className="icon-button" onClick={onExit}><Icon name="back"/></button><div className="game-title"><strong>{game.format==='sitngo'?'Sit & Go':'Texas Hold’em'}</strong><span>{streetName[game.street]} · {game.smallBlind}/{game.bigBlind} · #{game.handNumber}{game.format==='sitngo'?` · Ур. ${Math.floor((game.handNumber-1)/SITNGO_HANDS_PER_LEVEL)+1}`:''}</span></div><button className="icon-button" aria-label="История раздачи" onClick={()=>{setReplayNumber(null);setReplayIndex(0);setSheet('history');}}><Icon name="history"/></button><button className="icon-button" aria-label="Настройки стола" onClick={()=>{setSheet('settings');}}><Icon name="settings"/></button></div>
    <div className={`table-stage seats-${game.opponentCount}`}>
      <div className="table-felt"><div className="table-felt-inner"/><div className="table-grain"/></div>
      {game.order.filter(id=>id!=='hero').map((id,i)=><Opponent key={id} game={game} id={id} seat={seatCoords[game.opponentCount][i]} action={notice?.player===id?notice.message:undefined} onInspect={setInspected}/>)}
      {game.order.map(id=>{
        const player=game.players[id];
        if(player.streetBet<=0||game.result)return null;
        const coords= id==='hero'?{x:50,y:84}:seatCoords[game.opponentCount][game.order.filter(v=>v!=='hero').indexOf(id)];
        const pos=betCoordinates(coords);
        return <div key={`bet-${id}`} className={`wager-stack wager-${id==='hero'?'hero':'opponent'}`} style={{'--bet-x':`${pos.x}%`,'--bet-y':`${pos.y}%`} as CSSProperties}>
          <ChipRack amount={player.streetBet} groups={inventoryGroups(player.streetChips)} size="bet" maxGroups={3}/>
          <span className="wager-total">{money(player.streetBet)}</span>
        </div>;
      })}
      <div className="table-center"><span className="pot-label">{game.result?'РАЗЫГРАНО':'ОБЩИЙ БАНК'}</span><strong className="pot-number" key={`${game.handNumber}-${game.pot}`}>{money(game.pot)}</strong>
        {onStreet>0&&<div className="collected-stack"><ChipRack amount={onStreet} groups={inventoryGroups(game.potChips)} size="large"/></div>}
        <div className="community-cards">{Array.from({length:5},(_,i)=><CardFace key={`${game.handNumber}-${i}-${game.board[i]?cardText(game.board[i]):'empty'}`} card={game.board[i]}/>)}</div>
      </div>
      {foldFlights.map(f=><div key={`fold-${f.key}`} className="fold-flight" style={{'--fold-x':`${f.x}%`,'--fold-y':`${f.y}%`} as CSSProperties} aria-hidden="true"><CardFace hidden small/><CardFace hidden small/></div>)}
      {flights.map(f=><div key={f.key} className={`chip-flight-real chip-motion-${f.kind}`} style={{'--start-x':`${f.from.x}%`,'--start-y':`${f.from.y}%`,'--end-x':`${f.to.x}%`,'--end-y':`${f.to.y}%`} as CSSProperties} aria-hidden="true"><i/><i/><i/></div>)}
      <span className="table-event" key={notice?.seq??'none'} role="status" aria-live="polite">{notice?`${game.players[notice.player]?.name??'Игрок'} · ${notice.message}`:''}</span>
      <div className={`table-hero ${heroTurn?'acting':''}`}>
        <button className="hero-bankroll" onClick={()=>setInspected('hero')} aria-label={`Твой стек ${money(hero.stack)} фишек, подробнее`}><span>ТЫ {game.button==='hero'?'· D':''}</span><strong>{money(hero.stack)}</strong><ChipRack amount={hero.stack} groups={inventoryGroups(hero.chips)} size="small" maxGroups={3}/></button>
        <div className="hero-cards">{!hero.folded&&hero.hand.map((card,i)=><CardFace key={`${game.handNumber}-${i}`} card={card} small/>)}</div>
        {notice?.player==='hero'&&<span key={notice.seq} className="seat-action hero-action">{notice.message}</span>}
      </div>
    </div>
    {game.result&&<div className="end-overlay"><span className="result-emblem">♠</span><strong>{game.result}</strong>{game.format==='sitngo'&&game.matchOver&&<div className="tourney-finish"><b>Место {game.heroPlace} из {game.order.length}</b><span>+{game.tournamentAward} учебных очков</span></div>}<span>{game.matchOver?'Матч завершён. Можно начать новый.':'Раздача завершена, стеки сохранены.'}</span></div>}
    <div className="action-dock">
      {game.result?<button className="big-primary" onClick={()=>game.matchOver?onNewTable():setGame(s=>nextHand(s))}>{game.matchOver?'Новый матч':'Следующая раздача'} <Icon name="chevron" size={18}/></button>:
      <><div className="action-caption"><span>{heroTurn?'Твой ход':game.actor?`${game.players[game.actor]?.name??'Соперник'} думает…`:'Продолжаем раздачу'}</span><strong>{heroTurn?toCall?`К коллу ${money(toCall)}`:'Можно сделать чек':''}</strong></div>
      <div className="table-actions"><button className="action-fold" disabled={!heroTurn} onClick={()=>submit('fold')}>Фолд</button>{toCall>0&&!canCallWithChips?<button className="action-change" disabled={!heroTurn} onClick={()=>setGame(s=>exchangeForBet(s,'hero',amountToCall(s,'hero')))}>Размен для колла</button>:<button className="action-call" disabled={!heroTurn} onClick={()=>submit(toCall?'call':'check')}>{toCall?`Колл ${money(toCall)}`:'Чек'}</button>}<button className="action-raise" disabled={!heroTurn||!canRaise} onClick={()=>setRaiseOpen(true)}>Рейз</button></div></>}
    </div>
    {raiseOpen&&canRaise&&<div className="sheet-scrim raise-scrim" onClick={()=>setRaiseOpen(false)}><section className="raise-dialog" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Выбор размера рейза"><div className="raise-dialog-head"><div><span className="small-muted">Твой рейз</span><h2>Выбери размер</h2></div><button className="icon-button" aria-label="Закрыть окно рейза" onClick={()=>setRaiseOpen(false)}><Icon name="close"/></button></div><div className="raise-summary"><div><span>К коллу</span><strong>{money(toCall)}</strong></div><div><span>Мин. рейз</span><strong>{money(minRaise)}</strong></div><div><span>Макс.</span><strong>{money(maxRaise)}</strong></div></div><div className="raise-panel"><div><span>Рейз до</span><label className="raise-input-label"><input aria-label="Точный размер рейза" inputMode="numeric" type="number" min={minRaise} max={maxRaise} step="1" value={boundedRaise} onChange={e=>{if(e.target.value!=='')setRaise(Number(e.target.value));}}/><span>фишек</span></label></div><input type="range" aria-label="Размер рейза" min={minRaise} max={maxRaise} step={1} value={boundedRaise} onChange={e=>setRaise(Number(e.target.value))}/><div className="raise-presets"><button onClick={()=>setRaise(potFractionRaiseTo(game,'hero',.5))}>½ банка</button><button onClick={()=>setRaise(potFractionRaiseTo(game,'hero',1))}>Банк</button><button onClick={()=>setRaise(maxRaise)}>Олл-ин</button></div>{!canRaiseWithChips?<p className="raise-change-note">Для этой ставки понадобится размен.</p>:<ChipRack amount={raiseContribution} groups={paymentChipGroups(hero.chips,raiseContribution)??[]} size="small" maxGroups={5}/>}</div><div className="raise-dialog-actions"><button className="ghost-button" onClick={()=>setRaiseOpen(false)}>Отмена</button>{!canRaiseWithChips?<button className="big-primary" onClick={()=>setGame(s=>exchangeForBet(s,'hero',Math.max(0,boundedRaise-s.players.hero.streetBet)))}>Разменять для рейза</button>:<button className="big-primary" onClick={()=>submit('raise')}>Подтвердить рейз</button>}</div></section></div>}
    {inspected&&game.players[inspected]&&<div className="sheet-scrim" onClick={()=>setInspected(null)}><section className="bottom-sheet chips-detail-sheet" role="dialog" aria-modal="true" aria-label="Разбивка фишек по номиналам" onClick={e=>e.stopPropagation()}>
      <div className="sheet-head"><h2>{game.players[inspected].name} · {money(game.players[inspected].stack)}</h2><button className="icon-button" aria-label="Закрыть" onClick={()=>setInspected(null)} autoFocus><Icon name="close"/></button></div>
      <ChipRack amount={game.players[inspected].stack} groups={inventoryGroups(game.players[inspected].chips)} size="large"/>
      {inspected!=='hero'&&BOT_STYLES[inspected]&&<p className="bot-style-detail"><strong>{BOT_STYLES[inspected].title}</strong> · {BOT_STYLES[inspected].desc}</p>}
      {inspected==='hero'&&!game.result&&<div className="exchange-list"><h3>Разменять фишку</h3>{CHIP_DENOMINATIONS.slice(0,-1).filter(value=>hero.chips[value]>0).map(value=>{
      const lower=CHIP_DENOMINATIONS[CHIP_DENOMINATIONS.indexOf(value)+1];
      return <button key={value} onClick={()=>setGame(s=>exchangePlayerChip(s,'hero',value))}>1 × {value} <span>→</span> {value/lower} × {lower}</button>;
    })}{toCall>0&&!canCallWithChips&&<button className="exchange-suggest" onClick={()=>setGame(s=>exchangeForBet(s,'hero',amountToCall(s,'hero')))}>Разменять для колла {money(toCall)}</button>}</div>}
      <p className="chip-sheet-caption">Каждая фишка сохраняет номинал. Размен происходит только по команде.</p>
    </section></div>}
    {sheet&&<div className="sheet-scrim" onClick={()=>setSheet(null)}><section className="bottom-sheet" onKeyDown={e=>{if(e.key==='Escape')setSheet(null);}} role="dialog" aria-modal="true" aria-label={sheet==='settings'?'Настройки стола':'История раздачи'} onClick={e=>e.stopPropagation()}>
      <div className="sheet-head"><h2>{sheet==='settings'?'Настройки стола':'История раздачи'}</h2><button className="icon-button" autoFocus aria-label="Закрыть" onClick={()=>setSheet(null)}><Icon name="close"/></button></div>
      {sheet==='settings'?<><p className="sheet-hint">Новый матч заменит текущую игру.</p>{game.format==='sitngo'&&<div className="tournament-standings"><strong>Турнир · уровень {Math.floor((game.handNumber-1)/SITNGO_HANDS_PER_LEVEL)+1}</strong><span>{game.order.filter(id=>game.players[id].stack>0).length} из {game.order.length} игроков осталось</span><span>Следующий рост блайндов через {SITNGO_HANDS_PER_LEVEL-((game.handNumber-1)%SITNGO_HANDS_PER_LEVEL)} разд.</span><div>{[...game.order].sort((a,b)=>game.players[b].stack-game.players[a].stack).map((id,i)=><p key={id}>{i+1}. {game.players[id].name}<b>{game.players[id].stack>0?money(game.players[id].stack):'Выбыл'}</b></p>)}</div></div>}<div className="setting-label">Скорость игры</div><div className="speed-picker" role="group" aria-label="Скорость игры"><button aria-pressed={speed==='normal'} className={speed==='normal'?'active':''} onClick={()=>setSpeed('normal')}>Обычная</button><button aria-pressed={speed==='fast'} className={speed==='fast'?'active':''} onClick={()=>setSpeed('fast')}>Быстрая</button></div><p className="sheet-hint">Количество соперников и набор фишек выбираются при создании стола.</p><button className="big-primary" onClick={startNew}>Настроить новый стол</button></>:
      <div className="replay-browser"><p className="sheet-hint">История последних 25 раздач. Листай действия по одному.</p><div className="replay-hand-list">{activeReplays.map(item=><button key={item.number} onClick={()=>{setReplayNumber(item.number);setReplayIndex(0);}} className={replay?.number===item.number?'active':''}>#{item.number}<small>{item.result||'В процессе'}</small></button>)}</div>{frame?<><div className="replay-counter"><strong>{frame.label}</strong><span>{replayIndex+1} / {replay.frames.length}</span></div><div className="replay-felt"><div className="replay-pot">Банк: <b>{money(frame.pot)}</b></div><div className="replay-board">{frame.board.map((card,i)=><ScenarioFace key={i} value={card}/>)}</div></div><div className="replay-seats">{frame.players.map(p=><div key={p.id} className={p.folded?'replay-folded':''}><strong>{p.name}</strong><span>{money(p.stack)} · ставка {money(p.streetBet)}{p.folded?' · пас':''}</span><div className="replay-cards">{p.cards.map((c,i)=><ScenarioFace value={c} key={i}/>)}</div></div>)}</div><div className="replay-controls"><button disabled={replayIndex===0} onClick={()=>setReplayIndex(n=>Math.max(0,n-1))}><Icon name="back" size={16}/> Назад</button><button disabled={replayIndex>=replay.frames.length-1} onClick={()=>setReplayIndex(n=>Math.min(replay.frames.length-1,n+1))}>Дальше <Icon name="chevron" size={16}/></button></div></>:<p>Истории пока нет. Сыграй первую раздачу.</p>}</div>}
    </section></div>}
  </section>;
}
function Assessment({profile,onSave,onCancel}:{profile:Profile;onSave:(p:Profile)=>void;onCancel?:()=>void}){
  const [draft,setDraft]=useState<Profile>(profile);
  const [step,setStep]=useState(0);
  const toggle=(field:'known'|'focus',id:string)=>setDraft(p=>({...p,[field]:p[field].includes(id)?p[field].filter(x=>x!==id):[...p[field],id]}));
  return <div className="assessment-screen"><div className="study-header"><button className="icon-button" onClick={step?()=>setStep(0):onCancel??(()=>onSave({...draft,configured:true}))}><Icon name="back"/></button><span>Знакомство · {step+1}/2</span><button className="skip-button" onClick={()=>onSave({...draft,configured:true})}>Пропустить</button></div><div className="progress-track"><span style={{width:`${(step+1)*50}%`}}/></div>
  {step===0?<><h1>Как давно играешь?</h1><p className="short-description">Это поможет подобрать материалы.</p><div className="assessment-options">{([['new','Пока учусь правилам'],['some','Уже играю'],['confident','Хорошо знаю основы']] as const).map(([value,title])=><button className={draft.experience===value?'selected':''} key={value} onClick={()=>setDraft(p=>({...p,experience:value}))}>{title}<span>{draft.experience===value?'✓':''}</span></button>)}</div></>:
  <><h1>Что интересно?</h1><p className="short-description">Отметь нужное. Всё остальное тоже будет доступно.</p><div className="topic-choices">{modules.map(m=><div className="topic-choice" key={m.id}><strong>{m.title}</strong><div><button className={draft.known.includes(m.id)?'selected':''} onClick={()=>toggle('known',m.id)}>Знаю</button><button className={draft.focus.includes(m.id)?'selected':''} onClick={()=>toggle('focus',m.id)}>Хочу изучить</button></div></div>)}</div></>}
  <div className="assessment-bottom"><button className="big-primary" onClick={()=>step===0?setStep(1):onSave({...draft,configured:true})}>{step===0?'Дальше':'Готово'} <Icon name="chevron" size={18}/></button></div></div>;
}
function Study({module,session,setSession,onBack,onFinish}:{module:Module;session:Session;setSession:Dispatch<SetStateAction<Session>>;onBack:()=>void;onFinish:(id:string,correct:number,total:number)=>void}){
  const scenario=module.scenarios[Math.min(session.index,module.scenarios.length-1)];
  const choose=(index:number)=>{if(session.choice===null)setSession(s=>({...s,choice:index}));};
  const advance=()=>{
    if(session.choice===null)return;
    const correct=session.correct+(session.choice===scenario.correct?1:0);
    if(session.index>=module.scenarios.length-1){onFinish(module.id,correct,module.scenarios.length);setSession(s=>({...s,correct,phase:'finished'}));}
    else setSession(s=>({...s,index:s.index+1,choice:null,correct}));
  };
  const currentTheory=Math.min(Math.max(0,session.theoryIndex??0),module.theory.length-1);
  const progress=session.phase==='theory'?Math.round((currentTheory+1)/(module.theory.length+module.scenarios.length)*100):session.phase==='finished'?100:Math.round((module.theory.length+session.index+1)/(module.theory.length+module.scenarios.length)*100);
  return <div className="study-screen"><div className="study-header"><button className="icon-button" aria-label="Назад к темам" onClick={onBack}><Icon name="back"/></button><span className="truncate">{module.title}</span><span className="counter">{session.phase==='practice'?`${session.index+1}/${module.scenarios.length}`:''}</span></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div>
    {session.phase==='theory'?<><div className="reading-content reading-cards"><div className="reading-kicker">Теория · {currentTheory+1} из {module.theory.length}</div><h1>{module.title}</h1><article className="reading-section reading-slide" key={currentTheory}><div className="lesson-step-mark">{String(currentTheory+1).padStart(2,'0')}</div><h2>{module.theory[currentTheory].heading}</h2><p>{module.theory[currentTheory].text}</p></article><div className="reading-step-dots">{module.theory.map((_,i)=><button key={i} aria-label={`Перейти к части ${i+1}`} className={i===currentTheory?'active':''} onClick={()=>setSession(s=>({...s,theoryIndex:i}))}/>)}</div></div><div className="study-footer study-footer-dual">{currentTheory>0&&<button className="ghost-button" onClick={()=>setSession(s=>({...s,theoryIndex:currentTheory-1}))}>Назад</button>}<button className="big-primary" onClick={()=>currentTheory+1<module.theory.length?setSession(s=>({...s,theoryIndex:currentTheory+1})):setSession(s=>({...s,phase:'practice',index:0,choice:null,correct:0}))}>{currentTheory+1<module.theory.length?'Дальше':'Перейти к раздачам'} <Icon name="chevron" size={18}/></button></div></>:
    session.phase==='practice'?<><div className="scenario-content"><div className="scenario-context"><span className="reading-kicker">Игровая ситуация</span><h1>{scenario.title}</h1><p>{scenario.context}</p></div>
      {(scenario.hand||scenario.board)&&<div className="scenario-table"><div className="scenario-board">{scenario.board?.map((card,i)=><ScenarioFace value={card} key={i}/>)}</div><div className="scenario-hand">{scenario.hand?.map((card,i)=><ScenarioFace value={card} key={i}/>)}</div></div>}
      <h2 className="scenario-question">{scenario.question}</h2><div className="scenario-decision-hint">Прими решение как за столом. После ответа увидишь разбор.</div><div className="scenario-answers">{scenario.choices.map((choice,i)=><button key={i} disabled={session.choice!==null} onClick={()=>choose(i)} className={session.choice===null?'':i===scenario.correct?'correct':session.choice===i?'incorrect':'dimmed'}><span>{choice}</span>{session.choice!==null&&i===scenario.correct?'✓':''}</button>)}</div>
      {session.choice!==null&&<div className="scenario-explanation"><strong>{session.choice===scenario.correct?'Верное решение':'Разберём решение'}</strong><p>{scenario.explanation}</p><small>Разбор относится к заданным условиям и профилю соперника.</small></div>}
    </div>{session.choice!==null&&<div className="study-footer"><button className="big-primary" onClick={advance}>{session.index+1<module.scenarios.length?'Следующая ситуация':'Завершить'} <Icon name="chevron" size={18}/></button></div>}</>:
    <div className="finish-screen"><span className="finish-mark">♠</span><h1>{session.correct} из {module.scenarios.length}</h1><p>Практика завершена. К любой теме можно вернуться.</p><button className="big-primary" onClick={onBack}>К темам <Icon name="chevron" size={18}/></button><button className="text-button" onClick={()=>setSession(s=>({...s,phase:'theory',index:0,choice:null,correct:0}))}>Пройти заново</button></div>}
  </div>;
}
function Academy({profile,setProfile,progress,setProgress,session,setSession,game}:{profile:Profile;setProfile:Dispatch<SetStateAction<Profile>>;progress:Progress;setProgress:Dispatch<SetStateAction<Progress>>;session:Session;setSession:Dispatch<SetStateAction<Session>>;game:GameState}){
  const [editing,setEditing]=useState(false);
  const [labOpen,setLabOpen]=useState(false);
  const [filter,setFilter]=useState<'all'|'focus'|'done'|'review'>('all');
  const selected=modules.find(m=>m.id===session.moduleId);
  const sorted=useMemo(()=>[...modules].sort((a,b)=>{
    const weight=(m:Module)=>{const attempt=progress.attempts[m.id];return (attempt&&attempt.correct<attempt.total?-3:0)+(profile.focus.includes(m.id)?-2:0)+(profile.known.includes(m.id)?2:0)+(profile.experience==='confident'&&m.level.toLowerCase().includes('продвинут')?-1:0);};
    return weight(a)-weight(b);
  }),[profile,progress.attempts]);
  const visible=sorted.filter(m=>filter==='all'||(filter==='focus'?profile.focus.includes(m.id):filter==='review'?Boolean(progress.attempts[m.id]&&progress.attempts[m.id].correct<progress.attempts[m.id].total):progress.completed.includes(m.id)));
  if(labOpen)return <section className="academy-screen"><PokerLab game={game} onBack={()=>setLabOpen(false)}/></section>;
  if(editing||!profile.configured)return <section className="academy-screen"><button className="academy-lab-quick" onClick={()=>setLabOpen(true)}>Открыть лабораторию →</button><Assessment profile={profile} onSave={p=>{setProfile(p);setEditing(false);}} onCancel={editing?()=>setEditing(false):undefined}/></section>;
  if(selected)return <section className="academy-screen"><Study module={selected} session={session} setSession={setSession} onBack={()=>setSession(emptySession)} onFinish={(id,correct,total)=>setProgress(p=>({...p,completed:[...new Set([...p.completed,id])],attempts:{...p.attempts,[id]:{correct,total}}}))}/></section>;
  const recommended=sorted.find(m=>!progress.completed.includes(m.id))??sorted[0];
  return <section className="academy-screen academy-library"><div className="academy-heading"><div><span className="small-muted">Академия</span><h1>Учёба</h1></div><button className="outline-icon" aria-label="Изменить интересы" onClick={()=>setEditing(true)}><Icon name="settings" size={20}/></button></div>
    <button className="academy-lab-entry" onClick={()=>setLabOpen(true)}><span className="lab-entry-mark">♣</span><span><strong>Покерная лаборатория</strong><small>Шансы банка · Карты · Мои раздачи</small></span><Icon name="chevron" size={20}/></button>
    <button className="recommend-row" onClick={()=>setSession({...emptySession,moduleId:recommended.id})}><div><span className="small-muted">Продолжить</span><strong>{recommended.title}</strong><span>{progress.attempts[recommended.id]&&progress.attempts[recommended.id].correct<progress.attempts[recommended.id].total?'Разобрать ошибки':'Теория → игровые решения'}</span></div><Icon name="chevron"/></button>
    <div className="library-title"><h2>Темы</h2><span>{progress.completed.length}/{modules.length} пройдено</span></div>
    <div className="filter-tabs" role="group" aria-label="Фильтр тем"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Все</button><button className={filter==='focus'?'active':''} onClick={()=>setFilter('focus')}>Интересуют</button><button className={filter==='review'?'active':''} onClick={()=>setFilter('review')}>Повторить</button><button className={filter==='done'?'active':''} onClick={()=>setFilter('done')}>Пройдено</button></div>
    <div className="module-list">{visible.map(m=><button key={m.id} className="module-row" onClick={()=>setSession({...emptySession,moduleId:m.id})}><span className={`module-symbol ${progress.completed.includes(m.id)?'done':''}`}>{progress.completed.includes(m.id)?'✓':'♠'}</span><span className="module-info"><strong>{m.title}</strong><small>{progress.attempts[m.id]?`${progress.attempts[m.id].correct}/${progress.attempts[m.id].total} · `:''}{m.tag.toLowerCase()} · практика</small></span><Icon name="chevron" size={18}/></button>)}{visible.length===0&&<p className="empty-filter">Пока здесь пусто. Можно выбрать другие темы в настройках.</p>}</div>
  </section>;
}
function Stats({game,progress,career}:{game:GameState;progress:Progress;career:CareerResult[]}){
  const points=career.reduce((n,x)=>n+x.points,0);
  const victories=career.filter(x=>x.place===1).length;
  const podiums=career.filter(x=>x.place<=3).length;
  const net=game.players.hero.stack-chipInventoryTotal(game.startingChips);
  return <section className="stats-screen"><span className="small-muted">Статистика</span><h1>Прогресс</h1><div className="stats-highlight"><span>Текущий стек</span><strong>{money(game.players.hero.stack)}</strong><small>{net>=0?'+':''}{money(net)} фишек за этот матч</small></div>
    <div className="stats-list"><div><span>Сыграно раздач</span><strong>{game.handsFinished}</strong></div><div><span>Выиграно раздач</span><strong>{game.heroWins}</strong></div><div><span>Пройдено тем</span><strong>{progress.completed.length} / {modules.length}</strong></div></div>
    <section className="career-stats"><h2>Карьера Sit & Go</h2><div className="career-metrics"><div><strong>{career.length}</strong><small>Турниров</small></div><div><strong>{victories}</strong><small>Побед</small></div><div><strong>{points}</strong><small>Очков</small></div></div><div className="career-missions"><h3>Испытания</h3><p className={career.length?'achieved':''}>{career.length?'✓':'○'} Первый турнир</p><p className={podiums?'achieved':''}>{podiums?'✓':'○'} Попасть в топ-3</p><p className={victories?'achieved':''}>{victories?'✓':'○'} Выиграть Sit & Go</p></div>{career.length>0&&<div className="career-results"><h3>Последние результаты</h3>{career.slice(-5).reverse().map(x=><div key={x.id}><span>{x.place}-е место из {x.players}</span><b>+{x.points}</b></div>)}</div>}</section>
    <h2>Разобранные темы</h2><div className="completed-list">{modules.filter(m=>progress.completed.includes(m.id)).map(m=><div key={m.id}><span>{m.title}</span><strong>{progress.attempts[m.id]?.correct??0}/{progress.attempts[m.id]?.total??m.scenarios.length}</strong></div>)}{progress.completed.length===0&&<p>Здесь будут результаты твоих тренировок.</p>}</div>
  </section>;
}
export default function App(){
  const [page,setPage]=useState<Page>(loadPage);
  const [game,setGame]=useState<GameState>(loadGame);
  const [started,setStarted]=useState<boolean>(loadStarted);
  const [profile,setProfile]=useState<Profile>(loadProfile);
  const [progress,setProgress]=useState<Progress>(loadProgress);
  const [session,setSession]=useState<Session>(loadSession);
  const [career,setCareer]=useState<CareerResult[]>(()=>load<CareerResult[]>(CAREER_KEY,[]));
  useEffect(()=>{try{localStorage.setItem(GAME_KEY,JSON.stringify(game));}catch{}},[game]);
  useEffect(()=>{try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{}},[profile]);
  useEffect(()=>{try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}catch{}},[progress]);
  useEffect(()=>{try{localStorage.setItem(PAGE_KEY,JSON.stringify(page));}catch{}},[page]);
  useEffect(()=>{try{localStorage.setItem(SESSION_KEY,JSON.stringify(session));}catch{}},[session]);
  useEffect(()=>{try{localStorage.setItem(CAREER_KEY,JSON.stringify(career));}catch{}},[career]);
  useEffect(()=>{
    if(game.format!=='sitngo'||!game.matchOver||game.heroPlace==null)return;
    const id=game.tournamentId;
    setCareer(items=>items.some(x=>x.id===id)?items:[...items,{id,place:game.heroPlace!,players:game.order.length,points:game.tournamentAward,completedAt:Date.now()}].slice(-100));
  },[game.format,game.matchOver,game.heroPlace,game.tournamentId,game.tournamentAward,game.order.length]);
  useEffect(()=>{if('serviceWorker' in navigator&&import.meta.env.PROD)navigator.serviceWorker.register('./sw.js').catch(()=>{});},[]);
  useEffect(()=>{try{localStorage.setItem(READY_KEY,JSON.stringify(started));}catch{}},[started]);
  const navigate=(to:Page)=>{setPage(to);window.scrollTo({top:0,behavior:'instant'});};
  const startTable=(seats:number,chips:ChipInventory,blind:number,difficulty:BotDifficulty,format:GameFormat)=>{setGame(newMatch(seats,chips,blind,difficulty,format));setStarted(true);};
  const configureTable=()=>{if(started&&(game.handsFinished>0||game.handNumber>1||game.pot>0)&&!window.confirm('Настроить новый стол? Текущий матч будет заменён.'))return;setStarted(false);};
    return <div className={`app-shell ${page==='play'?'playing':''}`}>
    {page!=='play'&&<aside className="desktop-rail"><button className="wordmark" onClick={()=>navigate('home')}>pocket<span>.</span></button><div className="desktop-tabs">{([{page:'home',name:'Главная',icon:'home'},{page:'play',name:'Играть',icon:'spade'},{page:'academy',name:'Учёба',icon:'book'},{page:'stats',name:'Прогресс',icon:'stats'}] as const).map(t=><button key={t.page} onClick={()=>navigate(t.page)} className={page===t.page?'active':''}><Icon name={t.icon}/>{t.name}</button>)}</div><small>POCKET 1.0 · только условные фишки</small></aside>}
    <main className="app-main">{page!=='play'&&<Header page={page} onChange={navigate}/>}
      {page==='home'?<Home game={game} onChange={navigate}/>:
        page==='play'?(started?<GameTable game={game} setGame={setGame} onExit={()=>navigate('home')} onNewTable={configureTable}/>:<TableSetup defaultSeats={game.opponentCount} defaultChips={game.startingChips} defaultBlind={game.initialBlind} defaultDifficulty={game.botDifficulty} defaultFormat={game.format} onStart={startTable} onExit={()=>navigate('home')}/>):
        page==='academy'?<Academy profile={profile} setProfile={setProfile} progress={progress} setProgress={setProgress} session={session} setSession={setSession} game={game}/>:
        <Stats game={game} progress={progress} career={career}/>}
    </main>
    {page!=='play'&&<TabBar page={page} onChange={navigate}/>}
  </div>;
}
