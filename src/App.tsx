import { useEffect, useMemo, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { act, amountToCall, botMove, cardText, maxRaiseTo, minRaiseTo, newMatch, nextHand, type Card, type GameState } from './engine';
import { modules, type Module } from './lessons';

type Page='home'|'play'|'academy'|'stats';
type Profile={configured:boolean;experience:'new'|'some'|'confident';known:string[];focus:string[]};
type Progress={completed:string[];attempts:Record<string,{correct:number;total:number}>};
const GAME_KEY='pocket-v2-game';
const PROFILE_KEY='pocket-v2-profile';
const PROGRESS_KEY='pocket-v2-progress';
const defaultProfile:Profile={configured:false,experience:'new',known:[],focus:[]};
const defaultProgress:Progress={completed:[],attempts:{}};
const money=(n:number)=>n.toLocaleString('ru-RU');
const streetTitle:Record<string,string>={preflop:'Префлоп',flop:'Флоп',turn:'Тёрн',river:'Ривер',showdown:'Вскрытие'};
function read<T>(key:string,fallback:T):T {try {const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}}
function loadGame():GameState {
  const saved=read<GameState|null>(GAME_KEY,null);
  if(saved && Array.isArray(saved.order) && saved.order.length>=2 && saved.order.length<=6 &&
    saved.order.includes('hero') && saved.players?.hero && saved.players.hero.hand &&
    Array.isArray(saved.deck) && saved.opponentCount>=1 && saved.opponentCount<=5 &&
    saved.order.every(id=>saved.players[id] && typeof saved.players[id].contributed==='number'))return saved;
  return newMatch(1);
}
function loadProfile():Profile {
  const p=read<Profile>(PROFILE_KEY,defaultProfile);
  return p && Array.isArray(p.known) && Array.isArray(p.focus) && ['new','some','confident'].includes(p.experience)?p:defaultProfile;
}
function loadProgress():Progress {
  const p=read<Progress>(PROGRESS_KEY,defaultProgress);
  return p && Array.isArray(p.completed) && p.attempts && typeof p.attempts==='object'?p:defaultProgress;
}
function CardFace({card,back=false,small=false}:{card?:Card;back?:boolean;small?:boolean}) {
  const red=card?.suit==='♥'||card?.suit==='♦';
  return <div className={`poker-card ${small?'small':''} ${!card||back?'card-back':''} ${red?'red':''}`}
    aria-label={back?'Закрытая карта':card?cardText(card):'Пустое место'}>
    {card&&!back?<><span>{cardText(card)}</span><strong>{card.suit}</strong></>:<span className="card-symbol">♠</span>}
  </div>;
}
function ScenarioCard({card}:{card:string}) {
  const red=card.includes('♥')||card.includes('♦');
  return <div className={`scenario-card ${red?'red':''}`} aria-label={card}><span>{card}</span><b>{card.slice(-1)}</b></div>;
}
function CardSlot(){return <div className="card-slot">·</div>;}
function Navigation({page,setPage}:{page:Page;setPage:(page:Page)=>void}) {
  const navigation:{key:Page;icon:string;label:string}[]=[
    {key:'home',icon:'⌂',label:'Главная'},{key:'play',icon:'♠',label:'Играть'},
    {key:'academy',icon:'◇',label:'Обучение'},{key:'stats',icon:'▥',label:'Прогресс'}
  ];
  return <><aside className="sidebar">
    <button className="brand" onClick={()=>setPage('home')} aria-label="POCKET — на главную"><span className="brand-icon">♠</span><span><strong>pocket<span className="brand-period">.</span></strong><small>the friendly poker club</small></span></button>
    <div className="nav-caption">НАВИГАЦИЯ</div>
    <nav className="sidebar-nav" aria-label="Главное меню">
      {navigation.map(item=><button key={item.key} className={`nav-link ${item.key===page?'active':''}`} onClick={()=>setPage(item.key)}>
        <span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.key===page&&<span className="nav-current">·</span>}
      </button>)}
    </nav>
    <div className="sidebar-bottom"><span className="side-glow">✦</span><b>Покер без суеты</b><p>Учись, играй и ошибайся в своём темпе. Только условные фишки.</p><small>POCKET 0.2 · бесплатно</small></div>
  </aside>
  <nav className="mobile-nav" aria-label="Главное меню">{navigation.map(item=><button key={item.key} className={item.key===page?'active':''} onClick={()=>setPage(item.key)}><span>{item.icon}</span>{item.label}</button>)}</nav></>;
}
function Home({game,profile,progress,setPage,openModule}:{game:GameState;profile:Profile;progress:Progress;setPage:(page:Page)=>void;openModule:(id:string)=>void}){
  const suggested=modules.find(m=>profile.focus.includes(m.id)&&!progress.completed.includes(m.id)) ??
    modules.find(m=>!profile.known.includes(m.id)&&!progress.completed.includes(m.id)) ?? modules[0];
  return <section className="page-content home-page">
    <div className="intro-kicker"><span className="green-dot"/> ТВОЙ ПОКЕРНЫЙ КЛУБ</div>
    <div className="home-hero">
      <div className="home-copy"><span className="eyebrow">ДОБРО ПОЖАЛОВАТЬ В POCKET</span><h1>Здесь всегда<br/><em>твой ход.</em></h1>
        <p>Спокойный покерный клуб и умная практика в одном месте. Сыграть пару раздач, разобраться с диапазонами или просто потренироваться — выбираешь сам.</p>
        <div className="hero-actions"><button className="primary-button" onClick={()=>setPage('play')}>♠ &nbsp; Продолжить игру <span>↗</span></button><button className="ghost-button" onClick={()=>setPage('academy')}>Перейти к обучению →</button></div>
      </div><div className="hero-art" aria-hidden="true"><div className="orb orb-a"/><div className="orb orb-b"/><span className="floating-card first">A<span>♠</span></span><span className="floating-card second">K<span>♥</span></span><div className="hero-art-label">PLAY A LITTLE. LEARN A LOT.</div></div>
    </div>
    <div className="section-title"><div><span className="eyebrow">ПРОДОЛЖИТЬ</span><h2>Что сегодня?</h2></div></div>
    <div className="home-tiles">
      <button className="home-tile" onClick={()=>setPage('play')}><span className="tile-icon play">♠</span><div><b>Покерный стол</b><p>Сейчас {game.opponentCount} {game.opponentCount===1?'соперник':game.opponentCount<5?'соперника':'соперников'} · раздача №{game.handNumber}</p></div><span className="tile-arrow">↗</span></button>
      <button className="home-tile" onClick={()=>profile.configured?openModule(suggested.id):setPage('academy')}><span className="tile-icon learn">◇</span><div><b>{profile.configured?suggested.title:'Настроить обучение'}</b><p>{profile.configured?'Теория → игровые ситуации':'Отметь, что уже знаешь и что хочешь изучать'}</p></div><span className="tile-arrow">↗</span></button>
    </div>
    <div className="mini-stats"><div><span>Сыграно раздач</span><b>{game.handsFinished}</b></div><div><span>Темы исследованы</span><b>{progress.completed.length} <small>/ {modules.length}</small></b></div><div><span>Текущий стек</span><b>{money(game.players.hero.stack)}</b></div></div>
  </section>;
}
function Opponent({game,id}:{game:GameState;id:string}){
  const p=game.players[id];
  return <div className={`opponent-seat ${game.actor===id?'current':''} ${p.folded||p.hand.length===0?'inactive':''}`}>
    <div className="seat-top"><div className="avatar">{p.name[0]}</div><div className="seat-name"><strong>{p.name}</strong><span>{p.stack===0?'Олл-ин / вне игры':p.folded?'Пас':game.actor===id?'Думает…':'Бот'}</span></div><b className="seat-chips">● {money(p.stack)}</b>{game.button===id&&<span className="dealer-chip">D</span>}</div>
    <div className="opponent-hand">{p.hand.length>0?p.hand.map((c,i)=><CardFace key={i} card={c} back={!game.revealBot||p.folded} small/>):<span className="empty-seat">Выбыл</span>}</div>
    {p.streetBet>0&&<span className="bet-pill">Ставка {money(p.streetBet)}</span>}
  </div>;
}
function GameTable({game,setGame}:{game:GameState;setGame:Dispatch<SetStateAction<GameState>>}) {
  const [raise,setRaise]=useState(40);
  const [settings,setSettings]=useState(false);
  const [seats,setSeats]=useState(game.opponentCount);
  const hero=game.players.hero;
  const call=amountToCall(game,'hero');
  const minRaise=Math.min(minRaiseTo(game),maxRaiseTo(game,'hero'));
  const maxRaise=maxRaiseTo(game,'hero');
  const canRaise=maxRaise>game.currentBet&&maxRaise>hero.streetBet;
  const myTurn=game.actor==='hero'&&!game.result;
  useEffect(()=>setRaise(minRaise),[game.handNumber,game.street,game.currentBet,minRaise]);
  useEffect(()=>{if(!game.actor||game.actor==='hero'||game.result)return;
    const id=game.actor;const timeout=setTimeout(()=>setGame(s=>s.actor===id?act(s,id,botMove(s,id)):s),410);
    return ()=>clearTimeout(timeout);
  },[game,setGame]);
  const submit=(kind:'fold'|'check'|'call'|'raise')=>setGame(s=>act(s,'hero',{kind,to:raise}));
  const beginNew=()=>{
    if(game.handsFinished>0||game.handNumber>1||game.result||game.players.hero.stack!==1000){
      if(!window.confirm('Начать новый стол? Текущая игра будет заменена, продолжить её потом не получится.'))return;
    }
    setGame(newMatch(seats));setSettings(false);
  };
  const total=game.order.length*1000;
  return <section className="page-content play-page">
    <div className="section-head"><div><span className="eyebrow">СВОБОДНАЯ ИГРА / TEXAS HOLD’EM</span><h1>Покерный стол</h1><p>Твой стол никуда не пропадает. Играй сколько хочешь — прогресс сохраняется автоматически.</p></div><button className="secondary-button" onClick={()=>{setSeats(game.opponentCount);setSettings(s=>!s)}}>{settings?'Закрыть':'⚙ Настройки стола'}</button></div>
    {settings&&<div className="table-settings"><div><span className="eyebrow">НОВЫЙ СТОЛ</span><h3>Сколько соперников?</h3><p>Выбери от одного до пяти ботов. У каждого 1 000 условных фишек, блайнды 10/20. Настройка начнёт новый матч.</p></div>
      <div className="seats-control" role="group" aria-label="Количество соперников">{[1,2,3,4,5].map(n=><button key={n} className={seats===n?'selected':''} onClick={()=>setSeats(n)} aria-pressed={seats===n}>{n}</button>)}</div>
      <button className="primary-button" onClick={beginNew}>Начать стол на {seats+1} игроков →</button></div>}
    <div className="felt-frame"><div className="felt"><div className="felt-rim"/>
      <div className={`opponents-grid count-${game.opponentCount}`}>{game.order.filter(id=>id!=='hero').map(id=><Opponent key={id} game={game} id={id}/>)}</div>
      <div className="felt-middle"><div className="pot-info"><span>ОБЩИЙ БАНК</span><strong>● {money(game.pot)}</strong></div><div className="board-cards">{Array.from({length:5},(_,i)=>game.board[i]?<CardFace key={i} card={game.board[i]}/>:<CardSlot key={i}/>)}</div><span className="street-pill">{streetTitle[game.street]} · раздача {game.handNumber}</span></div>
      <div className={`hero-seat ${myTurn?'current':''}`}><div className="avatar hero-avatar">Я</div><div className="hero-info"><strong>Ты {game.button==='hero'&&<span className="hero-dealer">D</span>}</strong><span>{hero.folded?'Сбросил карты':hero.stack===0?'Олл-ин / без фишек':myTurn?'Твой ход':'За столом'}</span><b>● {money(hero.stack)}</b></div><div className="hero-hand">{hero.hand.map((card,i)=><CardFace key={i} card={card} small/>)}</div>{hero.streetBet>0&&<span className="hero-bet">Ставка {hero.streetBet}</span>}</div>
    </div></div>
    {game.result?<div className="result-panel"><div><span className="eyebrow">РАЗДАЧА ЗАВЕРШЕНА</span><h3>{game.result}</h3><p>{game.matchOver?'Матч завершён, но ты остаёшься за столом. Можно начать новый матч с тем же числом ботов.':'Следующая раздача за тем же столом, с текущими стеками и новым дилером.'}</p></div><button className="primary-button" onClick={()=>setGame(s=>nextHand(s))}>{game.matchOver?'Сыграть новый матч':'Следующая раздача'} →</button></div>:
      <div className="action-panel"><div className="action-line"><div><span className="eyebrow">{myTurn?'ТВОЁ РЕШЕНИЕ':'ИГРА ПРОДОЛЖАЕТСЯ'}</span><h3>{myTurn?'Как сыграем?':`${game.players[game.actor||'hero']?.name||'Соперник'} принимает решение…`}</h3></div><span className="call-price">{myTurn?`К коллу: ${money(call)}`:`${game.order.length} мест · ${money(total)} фишек всего`}</span></div>
      <div className="action-buttons"><button disabled={!myTurn} className="fold-button" onClick={()=>submit('fold')}>Фолд</button><button disabled={!myTurn} className="light-button" onClick={()=>submit(call?'call':'check')}>{call?`Колл · ${money(call)}`:'Чек'}</button><button disabled={!myTurn||!canRaise} className="primary-button" onClick={()=>submit('raise')}>{canRaise?`Рейз до ${money(raise)}`:'Рейз'}</button></div>
      {canRaise&&<div className="bet-controls"><span>Размер рейза</span><input aria-label="Размер рейза" type="range" min={minRaise} max={maxRaise} step="1" disabled={!myTurn} value={Math.max(minRaise,Math.min(raise,maxRaise))} onChange={e=>setRaise(Number(e.target.value))}/><strong>{money(Math.max(minRaise,Math.min(raise,maxRaise)))}</strong><div className="bet-presets"><button disabled={!myTurn} onClick={()=>setRaise(Math.min(maxRaise,Math.max(minRaise,Math.floor(game.currentBet+game.pot/2))))}>½ банка</button><button disabled={!myTurn} onClick={()=>setRaise(Math.min(maxRaise,Math.max(minRaise,Math.floor(game.currentBet+game.pot))))}>Банк</button><button disabled={!myTurn} onClick={()=>setRaise(maxRaise)}>Макс</button></div></div>}
    </div>}
    <div className="below-table"><div className="surface-card"><div className="panel-heading"><h3>Хронология раздачи</h3><span>без спешки</span></div><div className="history-list">{game.history.slice(0,9).map((entry,i)=><p key={i}><span>{String(i+1).padStart(2,'0')}</span>{entry}</p>)}</div></div><div className="surface-card calm-card"><span className="calm-mark">✧</span><h3>Спокойный режим</h3><p>Без таймеров и реальных денег. Можно выйти в меню, обновить страницу и вернуться к той же раздаче. Боты не видят твои закрытые карты.</p></div></div>
  </section>;
}
function TopicButton({children,active,onClick}:{children:ReactNode;active:boolean;onClick:()=>void}){return <button className={`tag-toggle ${active?'selected':''}`} aria-pressed={active} onClick={onClick}>{children}</button>;}
function Assessment({profile,onSave,onCancel}:{profile:Profile;onSave:(p:Profile)=>void;onCancel?:()=>void}){
  const [local,setLocal]=useState<Profile>(profile);
  const toggle=(field:'known'|'focus',id:string)=>setLocal(p=>({...p,[field]:p[field].includes(id)?p[field].filter(x=>x!==id):[...p[field],id]}));
  return <div className="assessment"><div className="assessment-lead"><span className="eyebrow">КОРОТКОЕ ЗНАКОМСТВО</span><h2>Соберём обучение под тебя.</h2><p>Никаких экзаменов на входе. Просто отметь, что уже умеешь, и что хочется разобрать глубже. Все темы останутся доступны.</p></div>
    <div className="assessment-step"><span className="step-dot">01</span><div><h3>Какой у тебя опыт?</h3><div className="experience-options">{([['new','Начинаю с нуля'],['some','Уже играю'],['confident','Знаю теорию']] as const).map(([value,label])=><button key={value} onClick={()=>setLocal(p=>({...p,experience:value}))} className={local.experience===value?'selected':''}>{label}</button>)}</div></div></div>
    <div className="assessment-step"><span className="step-dot">02</span><div><h3>Отметь знакомые области и интересы</h3><p>Можно отметить оба пункта: «знаю» и «хочу глубже».</p><div className="assessment-topics">{modules.map(module=><div className="assessment-topic" key={module.id}><div><b>{module.title}</b><span>{module.teaser}</span></div><div className="assessment-toggles"><TopicButton active={local.known.includes(module.id)} onClick={()=>toggle('known',module.id)}>✓ Уже знаю</TopicButton><TopicButton active={local.focus.includes(module.id)} onClick={()=>toggle('focus',module.id)}>✦ Хочу глубже</TopicButton></div></div>)}</div></div></div>
    <div className="assessment-actions"><button className="primary-button" onClick={()=>onSave({...local,configured:true})}>Собрать мой маршрут →</button>{onCancel&&<button className="ghost-button" onClick={onCancel}>Отмена</button>}</div>
  </div>;
}
function Study({module,onBack,onFinish,previous}:{module:Module;onBack:()=>void;onFinish:(id:string,correct:number,total:number)=>void;previous?:{correct:number;total:number}}){
  const [phase,setPhase]=useState<'theory'|'practice'|'finished'>('theory');
  const [index,setIndex]=useState(0);
  const [choice,setChoice]=useState<number|null>(null);
  const [correctCount,setCorrectCount]=useState(0);
  const question=module.scenarios[index];
  const answer=()=>{
    const count=correctCount+(choice===question.correct?1:0);
    setCorrectCount(count);
    if(index===module.scenarios.length-1){onFinish(module.id,count,module.scenarios.length);setPhase('finished');}
    else {setIndex(i=>i+1);setChoice(null);}
  };
  return <div className="study-view"><button className="back-link" onClick={onBack}>← Назад к маршруту</button>
    <div className="study-top"><span className="eyebrow">{module.tag} · {module.duration}</span><h2>{module.title}</h2><p>{module.teaser}</p><div className="study-stage"><span className={phase==='theory'?'active':''}>01 Теория</span><span className={phase==='practice'?'active':''}>02 Игровые ситуации</span><span className={phase==='finished'?'active':''}>03 Разбор</span></div></div>
    {phase==='theory'&&<div className="study-body"><div className="reading-tip">✧ &nbsp; Можно читать в своём темпе. Практика начнётся после теории.</div>
      {module.theory.map((p,i)=><article className="theory-block" key={i}><span>{String(i+1).padStart(2,'0')}</span><h3>{p.heading}</h3><p>{p.text}</p></article>)}
      <div className="theory-bottom"><button className="primary-button" onClick={()=>setPhase('practice')}>Перейти к игровым ситуациям →</button><small>2 раздачи · разбор любого ответа</small></div></div>}
    {phase==='practice'&&<div className="practice-layout"><div className="practice-card"><div className="practice-progress"><span>СИТУАЦИЯ {index+1} / {module.scenarios.length}</span><div className="progress-track"><div style={{width:`${(index+1)/module.scenarios.length*100}%`}}/></div></div>
      <h3>{question.title}</h3><p className="context-copy">{question.context}</p>
      {(question.hand||question.board)&&<div className="mini-felt"><span>БОРД</span><div className="mini-board">{question.board?.map((card,i)=><ScenarioCard key={i} card={card}/>)??<small>Префлоп</small>}</div><span>ТВОИ КАРТЫ</span><div className="mini-hand">{question.hand?.map((card,i)=><ScenarioCard key={i} card={card}/>)??<small>Выбор зависит от ситуации</small>}</div></div>}
      <h4>{question.question}</h4><div className="practice-options">{question.choices.map((option,i)=><button key={i} disabled={choice!==null} onClick={()=>setChoice(i)} className={`${choice===i?'picked':''} ${choice!==null&&i===question.correct?'correct':''} ${choice===i&&i!==question.correct?'incorrect':''}`}><b>{String.fromCharCode(65+i)}</b><span>{option}</span></button>)}</div>
      {choice!==null&&<div className="explanation-panel"><b>{choice===question.correct?'Верное решение.':'Здесь стоит сыграть иначе.'}</b><p>{question.explanation}</p><button className="primary-button" onClick={answer}>{index+1<module.scenarios.length?'Следующая ситуация →':'Посмотреть итог →'}</button></div>}
      </div><aside className="practice-aside"><span className="eyebrow">КОНТЕКСТ</span><h3>Важна логика решения</h3><p>В реальном покере многое зависит от диапазонов и соперников. Ситуации здесь имеют заданные условия, поэтому после любого ответа даётся объяснение.</p></aside></div>}
    {phase==='finished'&&<div className="finish-card"><span className="finish-emblem">✧</span><span className="eyebrow">РАЗБОР ЗАВЕРШЁН</span><h3>{correctCount} из {module.scenarios.length} решений</h3><p>Тема сохранена в прогрессе. Можешь повторить материал когда угодно — ошибочные ответы не блокируют дальнейшее обучение.</p>{previous&&<small>Предыдущий результат: {previous.correct} / {previous.total}</small>}<div className="finish-buttons"><button className="primary-button" onClick={onBack}>К моему маршруту →</button><button className="ghost-button" onClick={()=>{setPhase('theory');setIndex(0);setChoice(null);setCorrectCount(0);}}>Повторить</button></div></div>}
  </div>;
}
function Academy({profile,setProfile,progress,setProgress,selected,setSelected}:{profile:Profile;setProfile:Dispatch<SetStateAction<Profile>>;progress:Progress;setProgress:Dispatch<SetStateAction<Progress>>;selected:string|null;setSelected:(id:string|null)=>void}){
  const [editing,setEditing]=useState(false);
  const sorted=useMemo(()=>[...modules].sort((a,b)=>{
    const priority=(m:Module)=>profile.focus.includes(m.id)?0:profile.known.includes(m.id)?2:1;
    return priority(a)-priority(b)||modules.indexOf(a)-modules.indexOf(b);
  }),[profile]);
  const active=modules.find(m=>m.id===selected);
  const save=(p:Profile)=>{setProfile(p);setEditing(false);};
  if(editing||!profile.configured)return <section className="page-content academy-page"><Assessment profile={profile} onSave={save} onCancel={editing?()=>setEditing(false):undefined}/></section>;
  if(active)return <section className="page-content academy-page"><Study key={active.id} module={active} onBack={()=>setSelected(null)} previous={progress.attempts[active.id]} onFinish={(id,correct,total)=>setProgress(p=>({completed:[...new Set([...p.completed,id])],attempts:{...p.attempts,[id]:{correct,total}}}))}/></section>;
  return <section className="page-content academy-page"><div className="section-head"><div><span className="eyebrow">ТВОЁ ОБУЧЕНИЕ</span><h1>Учись так, как удобно.</h1><p>Выбирай любой материал. Сначала теория, потом настоящие покерные решения с разбором.</p></div><button className="secondary-button" onClick={()=>setEditing(true)}>⚙ Изменить интересы</button></div>
    <div className="academy-welcome"><div><span className="eyebrow">ПЕРСОНАЛЬНЫЙ МАРШРУТ</span><h2>{profile.focus.length?'Начнём с того, что тебе интересно':'Всё в твоём темпе'}</h2><p>Знакомые темы остаются доступными, а те, которые хочешь изучать глубже, подняты наверх. Тут нет обязательного порядка.</p></div><div className="academy-stat"><strong>{progress.completed.length}<small> / {modules.length}</small></strong><span>тем пройдено</span></div></div>
    <div className="section-title"><h2>Библиотека и практика</h2><span>{modules.length} направлений</span></div>
    <div className="module-grid">{sorted.map(m=><button className="module-card" key={m.id} onClick={()=>setSelected(m.id)}><div className="module-meta"><span>{m.tag}</span><span>{m.duration}</span></div><h3>{m.title}</h3><p>{m.teaser}</p><div className="module-footer"><span>{profile.focus.includes(m.id)?'✦ В приоритете':profile.known.includes(m.id)?'✓ Уже знакомо':m.level}</span><b>{progress.completed.includes(m.id)?`${progress.attempts[m.id]?.correct??0}/${progress.attempts[m.id]?.total??2} · Повторить`:'Изучать →'}</b></div></button>)}</div>
  </section>;
}
function Stats({game,progress,profile}:{game:GameState;progress:Progress;profile:Profile}){
  const winRate=game.handsFinished?Math.round(game.heroWins/game.handsFinished*100):0;
  const earned=game.players.hero.stack-1000;
  const badges=[['Раздач за столом',String(game.handsFinished)],['Выигранных раздач',String(game.heroWins)],['Выиграно / раздач',`${winRate}%`],['Тем изучено',`${progress.completed.length} / ${modules.length}`]];
  return <section className="page-content stats-page"><div className="section-head"><div><span className="eyebrow">ПРОГРЕСС</span><h1>Твоя дистанция.</h1><p>Статистика текущего стола, личный маршрут и результаты тренировки.</p></div></div>
    <div className="stats-grid">{badges.map(([label,value])=><div className="stat-card" key={label}><span>{label}</span><b>{value}</b></div>)}</div>
    <div className="statistics-highlight"><span className="eyebrow">ФИШКИ В ТЕКУЩЕМ МАТЧЕ</span><h2>{earned>0?'+':''}{money(earned)}</h2><p>Стек {money(game.players.hero.stack)} · старт 1 000 · {game.opponentCount} ботов</p></div>
    <div className="stats-reading"><h3>Твоё обучение</h3>{modules.filter(m=>progress.completed.includes(m.id)).length?<div className="completed-list">{modules.filter(m=>progress.completed.includes(m.id)).map(m=><div key={m.id}><span>{m.title}</span><strong>{progress.attempts[m.id]?.correct??0} / {progress.attempts[m.id]?.total??2}</strong></div>)}</div>:<p>Пока нет разобранных ситуаций. Начни с любой темы в обучении.</p>}
      <p className="stats-disclaimer">Отдельные победы и короткая дистанция не показывают, насколько ты сильный игрок. Позже здесь появятся история решений и более глубокая аналитика. Сейчас данные сохраняются только на этом устройстве.</p><span className="small-label">Маршрут: {profile.configured?'настроен':'не настроен'}</span></div>
  </section>;
}
export default function App(){
  const [page,setPage]=useState<Page>('home');
  const [game,setGame]=useState<GameState>(loadGame);
  const [profile,setProfile]=useState<Profile>(loadProfile);
  const [progress,setProgress]=useState<Progress>(loadProgress);
  const [selected,setSelected]=useState<string|null>(null);
  useEffect(()=>{try{localStorage.setItem(GAME_KEY,JSON.stringify(game));}catch{/* private mode */}},[game]);
  useEffect(()=>{try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{/* private mode */}},[profile]);
  useEffect(()=>{try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}catch{/* private mode */}},[progress]);
  useEffect(()=>{if('serviceWorker' in navigator && import.meta.env.PROD)navigator.serviceWorker.register('./sw.js').catch(()=>{});},[]);
  const openModule=(id:string)=>{setSelected(id);setPage('academy');};
  const titles:Record<Page,string>={home:'Главная',play:'Покерный клуб',academy:'Обучение',stats:'Прогресс'};
  return <div className="app-shell"><Navigation page={page} setPage={setPage}/><main className="main-content"><header className="topbar"><span>POCKET <i>/</i> {titles[page]}</span><span className="topbar-status"><span className="green-dot"/> Локальная игра · условные фишки</span></header>
    {page==='home'?<Home game={game} profile={profile} progress={progress} setPage={setPage} openModule={openModule}/>:
      page==='play'?<GameTable game={game} setGame={setGame}/>:
      page==='academy'?<Academy profile={profile} setProfile={setProfile} progress={progress} setProgress={setProgress} selected={selected} setSelected={setSelected}/>:
      <Stats game={game} progress={progress} profile={profile}/>}
  </main></div>;
}
