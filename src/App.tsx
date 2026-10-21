import { useEffect, useMemo, useState, type Dispatch, type SetStateAction, type CSSProperties } from 'react';
import { act, amountToCall, botMove, cardText, maxRaiseTo, minRaiseTo, newMatch, nextHand, type Card, type GameState } from './engine';
import { modules, type Module } from './lessons';

type Page = 'home' | 'play' | 'academy' | 'stats';
type Profile = { configured: boolean; experience: 'new' | 'some' | 'confident'; known: string[]; focus: string[] };
type Progress = { completed: string[]; attempts: Record<string, {correct:number; total:number}> };
type Session = { moduleId: string | null; phase: 'theory' | 'practice' | 'finished'; index: number; choice: number | null; correct: number };
const GAME_KEY = 'pocket-v2-game';
const PROFILE_KEY = 'pocket-v2-profile';
const PROGRESS_KEY = 'pocket-v2-progress';
const PAGE_KEY = 'pocket-v3-page';
const SESSION_KEY = 'pocket-v3-study';
const emptyProfile:Profile = {configured:false,experience:'new',known:[],focus:[]};
const emptyProgress:Progress = {completed:[],attempts:{}};
const emptySession:Session = {moduleId:null,phase:'theory',index:0,choice:null,correct:0};
const money = (n:number) => n.toLocaleString('ru-RU');
const playerCountLabel = (n:number) => `${n} ${n===2?'игрока':'игроков'}`;
const streetName:Record<string,string> = {preflop:'Префлоп',flop:'Флоп',turn:'Тёрн',river:'Ривер',showdown:'Вскрытие'};
const load = <T,>(key:string,fallback:T):T => {try {const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}};
function loadGame():GameState {
  const s=load<GameState|null>(GAME_KEY,null);
  if(s && Array.isArray(s.order) && s.order.length>=2 && s.order.length<=6 && s.order.includes('hero') &&
    s.players?.hero && Array.isArray(s.deck) && s.opponentCount>=1 && s.opponentCount<=5 &&
    s.order.every(id=>s.players[id] && Array.isArray(s.players[id].hand) && typeof s.players[id].contributed==='number')) return s;
  return newMatch(1);
}
function loadProfile():Profile {const p=load(PROFILE_KEY,emptyProfile);return p && Array.isArray(p.known) && Array.isArray(p.focus)?p:emptyProfile;}
function loadProgress():Progress {const p=load(PROGRESS_KEY,emptyProgress);return p && Array.isArray(p.completed) && p.attempts?p:emptyProgress;}
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
  return <div className={`card-face ${small?'card-small':''} ${hidden?'card-back':''} ${red?'red':''}`} aria-label={hidden?'Закрытая карта':card?cardText(card):'Место для карты'}>
    {!hidden&&card?<><span>{cardText(card)}</span><b>{card.suit}</b></>:hidden?<span className="back-pattern">♠</span>:null}
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
function Home({game,profile,progress,onChange,onStudy}:{game:GameState;profile:Profile;progress:Progress;onChange:(page:Page)=>void;onStudy:(id:string)=>void}){
  const recommended=modules.find(m=>profile.focus.includes(m.id) && !progress.completed.includes(m.id)) ?? modules.find(m=>!progress.completed.includes(m.id)) ?? modules[0];
  return <section className="home-screen"><div className="home-greeting"><span className="small-muted">Твоя игра</span><h1>С чего начнём?</h1></div>
    <button className="resume-tile" onClick={()=>onChange('play')}>
      <div className="resume-content"><span className="resume-tag">♠ &nbsp; TEXAS HOLD’EM</span><h2>{game.handsFinished || game.handNumber>1?'Вернуться за стол':'Сыграть в покер'}</h2><span>{playerCountLabel(game.opponentCount+1)} · Блайнды 10/20 · Раздача {game.handNumber}</span></div>
      <div className="resume-art" aria-hidden="true"><div className="resume-card first">A<span>♠</span></div><div className="resume-card second">K<span>♥</span></div></div>
      <span className="resume-cta">Играть <Icon name="chevron" size={18}/></span>
    </button>
    <div className="home-next"><div className="section-label-row"><h2>Продолжить обучение</h2><span>{progress.completed.length}/{modules.length}</span></div>
      <button className="learning-row" onClick={()=>profile.configured?onStudy(recommended.id):onChange('academy')}><div className="learning-icon"><Icon name="book"/></div><div><strong>{profile.configured?recommended.title:'Выбрать интересы'}</strong><span>{profile.configured?`${recommended.duration} · Теория и практика`:'Настроить свой маршрут'}</span></div><Icon name="chevron" size={19}/></button>
    </div>
    <div className="home-footer"><button onClick={()=>onChange('academy')}>Все темы <Icon name="chevron" size={16}/></button><button onClick={()=>onChange('stats')}>Мой прогресс <Icon name="chevron" size={16}/></button></div>
  </section>;
}
const seatCoords:Record<number,{x:number;y:number}[]>={
  1:[{x:50,y:12}],
  2:[{x:27,y:14},{x:73,y:14}],
  3:[{x:16,y:31},{x:50,y:10},{x:84,y:31}],
  4:[{x:15,y:34},{x:34,y:9},{x:66,y:9},{x:85,y:34}],
  5:[{x:11,y:44},{x:25,y:13},{x:50,y:7},{x:75,y:13},{x:89,y:44}]
};
function Opponent({game,id,seat}:{game:GameState;id:string;seat:{x:number;y:number}}){
  const p=game.players[id];const out=p.stack===0&&p.hand.length===0;
  return <div className={`table-opponent ${game.actor===id?'acting':''} ${p.folded||out?'folded':''}`} style={{'--seat-x':`${seat.x}%`,'--seat-y':`${seat.y}%`} as CSSProperties}>
    <span className="opponent-avatar">{p.name.slice(0,1)}</span><strong>{p.name}{game.button===id?' · D':''}</strong><span className="opponent-stack">{out?'Выбыл':p.folded?'Пас':money(p.stack)}</span>
    {p.hand.length>0&&<div className="opponent-cards">{p.hand.map((c,i)=><CardFace key={i} card={c} small hidden={!game.revealBot||p.folded}/>)}</div>}
    {p.streetBet>0&&<span className="opponent-bet">{money(p.streetBet)}</span>}
  </div>;
}
function GameTable({game,setGame,onExit}:{game:GameState;setGame:Dispatch<SetStateAction<GameState>>;onExit:()=>void}){
  const [sheet,setSheet]=useState<'settings'|'history'|null>(null);
  const [seats,setSeats]=useState(game.opponentCount);
  const [raiseOpen,setRaiseOpen]=useState(false);
  const [raise,setRaise]=useState(40);
  const hero=game.players.hero;
  const toCall=amountToCall(game,'hero');
  const minRaise=Math.min(minRaiseTo(game),maxRaiseTo(game,'hero'));
  const maxRaise=maxRaiseTo(game,'hero');
  const canRaise=maxRaise>game.currentBet&&maxRaise>hero.streetBet;
  const heroTurn=game.actor==='hero'&&!game.result;
  useEffect(()=>{setRaise(minRaise);setRaiseOpen(false);},[game.handNumber,game.street,game.currentBet,minRaise]);
  useEffect(()=>{
    if(!game.actor||game.actor==='hero'||game.result)return;
    const id=game.actor;const timeout=setTimeout(()=>setGame(s=>s.actor===id?act(s,id,botMove(s,id)):s),480);
    return ()=>clearTimeout(timeout);
  },[game,setGame]);
  const submit=(kind:'fold'|'call'|'check'|'raise')=>{setGame(s=>act(s,'hero',{kind,to:raise}));setRaiseOpen(false);};
  const startNew=()=>{
    if((game.handsFinished>0||game.handNumber>1||hero.stack!==1000)&&!window.confirm('Начать новый стол? Текущий матч будет заменён.'))return;
    setGame(newMatch(seats));setSheet(null);setRaiseOpen(false);
  };
  return <section className="game-screen">
    <div className="game-toolbar"><button aria-label="Вернуться на главную" className="icon-button" onClick={onExit}><Icon name="back"/></button><div className="game-title"><strong>Texas Hold’em</strong><span>{streetName[game.street]} · 10/20 · #{game.handNumber}</span></div><button className="icon-button" aria-label="История раздачи" onClick={()=>setSheet('history')}><Icon name="history"/></button><button className="icon-button" aria-label="Настройки стола" onClick={()=>{setSeats(game.opponentCount);setSheet('settings');}}><Icon name="settings"/></button></div>
    <div className={`table-stage seats-${game.opponentCount}`}>
      <div className="table-felt"><div className="table-felt-inner"/></div>
      {game.order.filter(id=>id!=='hero').map((id,i)=><Opponent key={id} game={game} id={id} seat={seatCoords[game.opponentCount][i]}/>)}
      <div className="table-center"><span className="pot-label">БАНК</span><strong className="pot-number">{money(game.pot)}</strong><div className="community-cards">{Array.from({length:5},(_,i)=><CardFace key={i} card={game.board[i]}/>)}</div></div>
      <div className={`table-hero ${heroTurn?'acting':''}`}><div className="hero-name"><span>ТЫ {game.button==='hero'?'· D':''}</span><strong>{money(hero.stack)}</strong></div><div className="hero-cards">{hero.hand.map((c,i)=><CardFace key={i} card={c}/>)}</div>{hero.streetBet>0&&<span className="hero-bet">Ставка {money(hero.streetBet)}</span>}</div>
      {game.result&&<div className="end-overlay"><strong>{game.result}</strong><span>{game.matchOver?'Матч завершён':'Раздача завершена'}</span></div>}
    </div>
    <div className="action-dock">
      {game.result?<button className="big-primary" onClick={()=>setGame(s=>nextHand(s))}>{game.matchOver?'Новый матч':'Следующая раздача'} <Icon name="chevron" size={18}/></button>:
      <><div className="action-caption"><span>{heroTurn?'Твой ход':game.actor?`${game.players[game.actor]?.name??'Соперник'} думает…`:'Продолжаем раздачу'}</span><strong>{heroTurn?toCall?`К коллу ${money(toCall)}`:'Можно сделать чек':''}</strong></div>
      {raiseOpen&&canRaise&&<div className="raise-panel"><div><span>Ставка</span><strong>{money(raise)}</strong></div><input type="range" aria-label="Размер рейза" min={minRaise} max={maxRaise} step={1} value={Math.min(maxRaise,Math.max(minRaise,raise))} onChange={e=>setRaise(Number(e.target.value))}/><div className="raise-presets"><button onClick={()=>setRaise(Math.min(maxRaise,Math.max(minRaise,Math.floor(game.currentBet+game.pot/2))))}>½ банка</button><button onClick={()=>setRaise(Math.min(maxRaise,Math.max(minRaise,Math.floor(game.currentBet+game.pot))))}>Банк</button><button onClick={()=>setRaise(maxRaise)}>Олл-ин</button></div></div>}
      <div className="table-actions"><button className="action-fold" disabled={!heroTurn} onClick={()=>submit('fold')}>Фолд</button><button className="action-call" disabled={!heroTurn} onClick={()=>submit(toCall?'call':'check')}>{toCall?`Колл ${money(toCall)}`:'Чек'}</button><button className="action-raise" disabled={!heroTurn||!canRaise} onClick={()=>raiseOpen?submit('raise'):setRaiseOpen(true)}>{raiseOpen?'Подтвердить':'Рейз'}</button></div>
      {raiseOpen&&<button className="cancel-raise" onClick={()=>setRaiseOpen(false)}>Отменить рейз</button>}</>}
    </div>
    {sheet&&<div className="sheet-scrim" onClick={()=>setSheet(null)}><section className="bottom-sheet" role="dialog" aria-modal="true" aria-label={sheet==='settings'?'Настройки стола':'История раздачи'} onClick={e=>e.stopPropagation()}>
      <div className="sheet-head"><h2>{sheet==='settings'?'Настройки стола':'История раздачи'}</h2><button className="icon-button" aria-label="Закрыть" onClick={()=>setSheet(null)}><Icon name="close"/></button></div>
      {sheet==='settings'?<><p className="sheet-hint">Новый матч заменит текущую игру.</p><div className="setting-label">Количество соперников</div><div className="seat-picker">{[1,2,3,4,5].map(n=><button key={n} className={seats===n?'active':''} aria-pressed={seats===n} onClick={()=>setSeats(n)}>{n}</button>)}</div><button className="big-primary" onClick={startNew}>Новый стол · {playerCountLabel(seats+1)}</button></>:
      <div className="history-entries">{game.history.length?game.history.map((entry,i)=><p key={i}>{entry}</p>):<p>Событий пока нет</p>}</div>}
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
  const progress=session.phase==='theory'?16:session.phase==='finished'?100:40+Math.floor(session.index/module.scenarios.length*50);
  return <div className="study-screen"><div className="study-header"><button className="icon-button" aria-label="Назад к темам" onClick={onBack}><Icon name="back"/></button><span className="truncate">{module.title}</span><span className="counter">{session.phase==='practice'?`${session.index+1}/${module.scenarios.length}`:''}</span></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div>
    {session.phase==='theory'?<><div className="reading-content"><div className="reading-kicker">{module.duration} · теория</div><h1>{module.title}</h1>{module.theory.map((p,i)=><article className="reading-section" key={i}><h2>{p.heading}</h2><p>{p.text}</p></article>)}</div><div className="study-footer"><button className="big-primary" onClick={()=>setSession(s=>({...s,phase:'practice',index:0,choice:null,correct:0}))}>Попробовать на практике <Icon name="chevron" size={18}/></button></div></>:
    session.phase==='practice'?<><div className="scenario-content"><div className="scenario-context"><span className="reading-kicker">Игровая ситуация</span><h1>{scenario.title}</h1><p>{scenario.context}</p></div>
      {(scenario.hand||scenario.board)&&<div className="scenario-table"><div className="scenario-board">{scenario.board?.map((card,i)=><ScenarioFace value={card} key={i}/>)}</div><div className="scenario-hand">{scenario.hand?.map((card,i)=><ScenarioFace value={card} key={i}/>)}</div></div>}
      <h2 className="scenario-question">{scenario.question}</h2><div className="scenario-answers">{scenario.choices.map((choice,i)=><button key={i} disabled={session.choice!==null} onClick={()=>choose(i)} className={session.choice===null?'':i===scenario.correct?'correct':session.choice===i?'incorrect':'dimmed'}><span>{choice}</span>{session.choice!==null&&i===scenario.correct?'✓':''}</button>)}</div>
      {session.choice!==null&&<div className="scenario-explanation"><strong>{session.choice===scenario.correct?'Верно':'Разберём решение'}</strong><p>{scenario.explanation}</p></div>}
    </div>{session.choice!==null&&<div className="study-footer"><button className="big-primary" onClick={advance}>{session.index+1<module.scenarios.length?'Следующая ситуация':'Завершить'} <Icon name="chevron" size={18}/></button></div>}</>:
    <div className="finish-screen"><span className="finish-mark">♠</span><h1>{session.correct} из {module.scenarios.length}</h1><p>Практика завершена. К любой теме можно вернуться.</p><button className="big-primary" onClick={onBack}>К темам <Icon name="chevron" size={18}/></button><button className="text-button" onClick={()=>setSession(s=>({...s,phase:'theory',index:0,choice:null,correct:0}))}>Пройти заново</button></div>}
  </div>;
}
function Academy({profile,setProfile,progress,setProgress,session,setSession}:{profile:Profile;setProfile:Dispatch<SetStateAction<Profile>>;progress:Progress;setProgress:Dispatch<SetStateAction<Progress>>;session:Session;setSession:Dispatch<SetStateAction<Session>>}){
  const [editing,setEditing]=useState(false);
  const [filter,setFilter]=useState<'all'|'focus'|'done'>('all');
  const selected=modules.find(m=>m.id===session.moduleId);
  const sorted=useMemo(()=>[...modules].sort((a,b)=>(profile.focus.includes(a.id)?0:1)-(profile.focus.includes(b.id)?0:1)),[profile.focus]);
  const visible=sorted.filter(m=>filter==='all'||(filter==='focus'?profile.focus.includes(m.id):progress.completed.includes(m.id)));
  if(editing||!profile.configured)return <section className="academy-screen"><Assessment profile={profile} onSave={p=>{setProfile(p);setEditing(false);}} onCancel={editing?()=>setEditing(false):undefined}/></section>;
  if(selected)return <section className="academy-screen"><Study module={selected} session={session} setSession={setSession} onBack={()=>setSession(emptySession)} onFinish={(id,correct,total)=>setProgress(p=>({...p,completed:[...new Set([...p.completed,id])],attempts:{...p.attempts,[id]:{correct,total}}}))}/></section>;
  const recommended=sorted.find(m=>!progress.completed.includes(m.id))??sorted[0];
  return <section className="academy-screen academy-library"><div className="academy-heading"><div><span className="small-muted">Академия</span><h1>Учёба</h1></div><button className="outline-icon" aria-label="Изменить интересы" onClick={()=>setEditing(true)}><Icon name="settings" size={20}/></button></div>
    <button className="recommend-row" onClick={()=>setSession({...emptySession,moduleId:recommended.id})}><div><span className="small-muted">Продолжить</span><strong>{recommended.title}</strong><span>{recommended.duration} · теория и практика</span></div><Icon name="chevron"/></button>
    <div className="library-title"><h2>Темы</h2><span>{progress.completed.length}/{modules.length} пройдено</span></div>
    <div className="filter-tabs" role="group" aria-label="Фильтр тем"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Все</button><button className={filter==='focus'?'active':''} onClick={()=>setFilter('focus')}>Интересуют</button><button className={filter==='done'?'active':''} onClick={()=>setFilter('done')}>Пройдено</button></div>
    <div className="module-list">{visible.map(m=><button key={m.id} className="module-row" onClick={()=>setSession({...emptySession,moduleId:m.id})}><span className={`module-symbol ${progress.completed.includes(m.id)?'done':''}`}>{progress.completed.includes(m.id)?'✓':'♠'}</span><span className="module-info"><strong>{m.title}</strong><small>{m.duration} · {m.tag.toLowerCase()}</small></span><Icon name="chevron" size={18}/></button>)}{visible.length===0&&<p className="empty-filter">Пока здесь пусто. Можно выбрать другие темы в настройках.</p>}</div>
  </section>;
}
function Stats({game,progress}:{game:GameState;progress:Progress}){
  const net=game.players.hero.stack-1000;
  return <section className="stats-screen"><span className="small-muted">Статистика</span><h1>Прогресс</h1><div className="stats-highlight"><span>Текущий стек</span><strong>{money(game.players.hero.stack)}</strong><small>{net>=0?'+':''}{money(net)} фишек за этот матч</small></div>
    <div className="stats-list"><div><span>Сыграно раздач</span><strong>{game.handsFinished}</strong></div><div><span>Выиграно раздач</span><strong>{game.heroWins}</strong></div><div><span>Пройдено тем</span><strong>{progress.completed.length} / {modules.length}</strong></div></div>
    <h2>Разобранные темы</h2><div className="completed-list">{modules.filter(m=>progress.completed.includes(m.id)).map(m=><div key={m.id}><span>{m.title}</span><strong>{progress.attempts[m.id]?.correct??0}/{progress.attempts[m.id]?.total??m.scenarios.length}</strong></div>)}{progress.completed.length===0&&<p>Здесь будут результаты твоих тренировок.</p>}</div>
  </section>;
}
export default function App(){
  const [page,setPage]=useState<Page>(loadPage);
  const [game,setGame]=useState<GameState>(loadGame);
  const [profile,setProfile]=useState<Profile>(loadProfile);
  const [progress,setProgress]=useState<Progress>(loadProgress);
  const [session,setSession]=useState<Session>(loadSession);
  useEffect(()=>{try{localStorage.setItem(GAME_KEY,JSON.stringify(game));}catch{}},[game]);
  useEffect(()=>{try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{}},[profile]);
  useEffect(()=>{try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}catch{}},[progress]);
  useEffect(()=>{try{localStorage.setItem(PAGE_KEY,JSON.stringify(page));}catch{}},[page]);
  useEffect(()=>{try{localStorage.setItem(SESSION_KEY,JSON.stringify(session));}catch{}},[session]);
  useEffect(()=>{if('serviceWorker' in navigator&&import.meta.env.PROD)navigator.serviceWorker.register('./sw.js').catch(()=>{});},[]);
  const navigate=(to:Page)=>{setPage(to);window.scrollTo({top:0,behavior:'instant'});};
  const openStudy=(id:string)=>{setSession({...emptySession,moduleId:id});navigate('academy');};
  return <div className={`app-shell ${page==='play'?'playing':''}`}>
    {page!=='play'&&<aside className="desktop-rail"><button className="wordmark" onClick={()=>navigate('home')}>pocket<span>.</span></button><div className="desktop-tabs">{([{page:'home',name:'Главная',icon:'home'},{page:'play',name:'Играть',icon:'spade'},{page:'academy',name:'Учёба',icon:'book'},{page:'stats',name:'Прогресс',icon:'stats'}] as const).map(t=><button key={t.page} onClick={()=>navigate(t.page)} className={page===t.page?'active':''}><Icon name={t.icon}/>{t.name}</button>)}</div><small>POCKET 0.3 · только условные фишки</small></aside>}
    <main className="app-main">{page!=='play'&&<Header page={page} onChange={navigate}/>}
      {page==='home'?<Home game={game} profile={profile} progress={progress} onChange={navigate} onStudy={openStudy}/>:
        page==='play'?<GameTable game={game} setGame={setGame} onExit={()=>navigate('home')}/>:
        page==='academy'?<Academy profile={profile} setProfile={setProfile} progress={progress} setProgress={setProgress} session={session} setSession={setSession}/>:
        <Stats game={game} progress={progress}/>}
    </main>
    {page!=='play'&&<TabBar page={page} onChange={navigate}/>}
  </div>;
}
