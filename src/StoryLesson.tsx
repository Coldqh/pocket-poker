import {useState} from 'react';
import LessonVisual from './LessonVisual';
import type {StoryLesson as StoryLessonData} from './story-lessons';
import type {StoryRecord} from './story-progress';

export default function StoryLesson({lesson,record,onBack,onVisit,onFinish}:{lesson:StoryLessonData;record:StoryRecord;onBack:()=>void;onVisit:(index:number)=>void;onFinish:()=>void}){
 const [replay,setReplay]=useState(0);
 const [showDetail,setShowDetail]=useState(false);
 const index=Math.max(0,Math.min(lesson.scenes.length-1,record.scene));
 const scene=lesson.scenes[index];
 const percent=Math.round((index+1)/lesson.scenes.length*100);
 const step=(next:number)=>{onVisit(next);setReplay(0);setShowDetail(false);};
 const last=index===lesson.scenes.length-1;
 return <div className="novel-screen" role="region" aria-label={'Урок '+lesson.title}>
   <div className="novel-toolbar"><button type="button" className="novel-exit" onClick={onBack} aria-label="Выйти из урока">×</button><div className="novel-toolbar-title"><span>{lesson.chapter}</span><strong>{lesson.title}</strong></div><span className="novel-count">{index+1}/{lesson.scenes.length}</span></div>
   <div className="novel-progress" role="progressbar" aria-label="Прогресс урока" aria-valuenow={index+1} aria-valuemin={1} aria-valuemax={lesson.scenes.length}><span style={{width:percent+'%'}}/></div>
   <div className="novel-body">
    <div className="novel-visual-shell">
      <LessonVisual scene={scene} replay={replay}/>
      <button type="button" className="novel-replay" onClick={()=>setReplay(k=>k+1)} aria-label="Повторить анимацию текущей сцены">↺ <span>Повторить</span></button>
    </div>
    <div className="novel-narration" aria-live="polite" key={scene.id}>
      <span className="novel-kicker">ИСТОРИЯ {String(index+1).padStart(2,'0')}</span>
      <h1>{scene.title}</h1><p>{scene.narration}</p>
      {scene.note&&<div className="novel-note"><button type="button" aria-expanded={showDetail} onClick={()=>setShowDetail(v=>!v)}>{showDetail?'Скрыть подробности':'Показать подробнее'} <span aria-hidden="true">⌄</span></button>{showDetail&&<p>{scene.note}</p>}</div>}
    </div>
   </div>
   <div className="novel-bottom">
    <button className="novel-back" type="button" onClick={()=>step(index-1)} disabled={index===0}>← <span>Назад</span></button>
    <button className="novel-next" type="button" onClick={()=>last?onFinish():step(index+1)}>{last?'Завершить историю':'Дальше'} <span aria-hidden="true">→</span></button>
   </div>
 </div>;
}
