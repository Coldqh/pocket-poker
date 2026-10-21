import {HAND_RANKINGS} from './hand-guide';
function Mini({card}:{card:string}){return <span className={'guide-mini-card '+(/[♥♦]/.test(card)?'red':'')} aria-label={card}>{card}</span>;}
export default function HandGuide({onClose}:{onClose:()=>void}){
 return <div className="sheet-scrim hand-guide-scrim" onClick={onClose}>
 <section className="bottom-sheet hand-guide-sheet" role="dialog" aria-modal="true" aria-label="Памятка покерных комбинаций" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')onClose();}}>
   <div className="sheet-head"><div><span className="guide-kicker">POCKET / СПРАВОЧНИК</span><h2>Комбинации</h2></div><button className="icon-button" onClick={onClose} aria-label="Закрыть памятку" autoFocus>×</button></div>
   <p className="guide-intro">Сильнейшая — сверху. В Холдеме выбирается лучшая пятёрка из двух твоих и пяти общих карт.</p>
   <div className="guide-ranking-list">{HAND_RANKINGS.map((hand,i)=><div className="guide-ranking" key={hand.title}>
     <span className="guide-rank">{String(i+1).padStart(2,'0')}</span>
     <div className="guide-ranking-text"><strong>{hand.title}</strong><small>{hand.description}</small><div className="guide-mini-row">{hand.cards.map(card=><Mini key={card} card={card}/>)}</div></div>
   </div>)}</div>
   <p className="guide-intro guide-end">При одинаковой комбинации учитываются достоинства карт и кикеры; при равной лучшей пятёрке банк делится.</p>
 </section></div>;
}
