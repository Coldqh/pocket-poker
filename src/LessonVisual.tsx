import {type CSSProperties} from 'react';
import type {StoryScene} from './story-lessons';

function Face({value,hidden=false,marked=false,delay=0}:{value:string;hidden?:boolean;marked?:boolean;delay?:number}){
 const red=value.includes('♥')||value.includes('♦');
 return <div className={'story-card '+(hidden?'back ':'')+(red?'red ':'')+(marked?'marked':'')} style={{'--deal-delay':delay+'ms'} as CSSProperties} aria-label={hidden?'Карта рубашкой вверх':value}>
  <span>{hidden?'':value}</span><b>{hidden?'P':value.slice(-1)}</b>
 </div>;
}
function CardRow({cards=[],hidden=false,highlight=[],offset=0}:{cards?:string[];hidden?:boolean;highlight?:string[];offset?:number}){
 return <div className="story-cards">{cards.map((value,i)=><Face key={value+'-'+i} value={value} hidden={hidden} marked={highlight.includes(value)} delay={offset+i*130}/>)}</div>;
}
function ChipPile({count=3}:{count?:number}){
 return <span className="story-chip-pile" aria-hidden="true">{Array.from({length:count},(_,i)=><i key={i} style={{'--chip-layer':i} as CSSProperties}/>)}</span>;
}
const demoHands=[['A♠','A♥'],['K♠','Q♠'],['8♣','7♣'],['7♦','2♠']];
export default function LessonVisual({scene,replay=0,reducedMotion=false}:{scene:StoryScene;replay?:number;reducedMotion?:boolean}){
 const cards=[scene.heroCards??[],scene.villainCards??[],scene.board??[]];
 const hasActual=cards.some(x=>x.length);
 const reveal=scene.type==='compare';
 const marked=scene.highlight??[];
 const showdown=reveal&&scene.animation==='winner';
 return <section key={scene.id+'-'+replay} className={'story-visual story-visual-'+scene.type+(reducedMotion?' story-still':'')} aria-label={'Учебная иллюстрация: '+scene.title}>
  <div className="story-felt" aria-hidden="true"><div className="story-felt-rim"/>
   <div className="story-opponent">
     <span className="story-seat"><span className="story-seat-icon">♠</span><small>СОПЕРНИК</small></span>
     {scene.villainCards?.length?<CardRow cards={scene.villainCards} hidden={!reveal} highlight={marked} offset={0}/>:<span className="story-avatar-filler">??</span>}
   </div>
   <div className="story-table-middle">
    <div className={'story-pot '+(showdown?'story-pot-winner':'')}><ChipPile/><span>{scene.pot!==undefined?'БАНК '+scene.pot:'БАНК'}</span></div>
    {scene.board?.length?<CardRow cards={scene.board} highlight={marked} offset={350}/>:<div className="story-board-placeholders">{Array.from({length:5},(_,i)=><span key={i}/>)}</div>}
   </div>
   <div className="story-player">
    <span className="story-seat story-seat-hero"><span className="story-seat-icon">★</span><small>ТЫ</small></span>
    {scene.heroCards?.length?<CardRow cards={scene.heroCards} highlight={marked} offset={180}/>:<div className="story-hand-placeholder"><i/><i/></div>}
   </div>
   {scene.type==='blinds'||scene.type==='action-demo'?<div className="story-bet-flow" aria-hidden="true"><span className="story-bet-chip"/><span className="story-bet-chip"/><span className="story-bet-chip"/></div>:null}
  </div>
  {scene.type==='range'&&<div className="story-hand-range">{demoHands.map((hand,i)=><span key={i} className={'story-range-set '+(i>1?'muted':'')}>{hand.join(' ')}</span>)}</div>}
  {(scene.visualLabel||scene.animation==='winner')&&<div className="story-visual-stamp">{scene.visualLabel??'БАНК ТЕБЕ'}</div>}
  {!hasActual&&scene.type!=='range'&&<span className="story-visual-footnote">{scene.type==='intro'?'Учимся прямо за столом':'Наблюдаем, как меняется раздача'}</span>}
 </section>;
}
