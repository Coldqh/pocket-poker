import {storyLessons,getStoryLesson} from './story-lessons.ts';
export type StoryRecord={scene:number;seen:string[];completedAt?:number};
export type StoryProgress={version:1;activeLesson:string|null;lessons:Record<string,StoryRecord>};
export const STORY_KEY='pocket-v23-stories';
export const emptyStoryProgress=():StoryProgress=>({version:1,activeLesson:null,lessons:{}});
export function hydrateStoryProgress(value:unknown):StoryProgress{
 const safe=emptyStoryProgress();
 if(!value||typeof value!=='object')return safe;
 const data=value as Partial<StoryProgress>;
 if(data.version!==1||!data.lessons||typeof data.lessons!=='object')return safe;
 for(const lesson of storyLessons){
  const candidate=data.lessons[lesson.id];
  if(!candidate||typeof candidate!=='object')continue;
  const scene=Number.isInteger(candidate.scene)?Math.max(0,Math.min(lesson.scenes.length-1,candidate.scene)):0;
  const valid=new Set(lesson.scenes.map(item=>item.id));
  const seen=Array.isArray(candidate.seen)?[...new Set(candidate.seen.filter((id):id is string=>typeof id==='string'&&valid.has(id)))]:[];
  safe.lessons[lesson.id]={scene,seen,...(typeof candidate.completedAt==='number'&&Number.isFinite(candidate.completedAt)&&candidate.completedAt>0?{completedAt:candidate.completedAt}:{})};
 }
 if(typeof data.activeLesson==='string'&&getStoryLesson(data.activeLesson))safe.activeLesson=data.activeLesson;
 return safe;
}
export function openStory(data:StoryProgress,id:string):StoryProgress{
 const lesson=getStoryLesson(id);
 if(!lesson)return data;
 const existing=data.lessons[id];
 const scene=existing?.completedAt?0:existing?.scene??0;
 const seen=existing?.seen??[];
 return {...data,activeLesson:id,lessons:{...data.lessons,[id]:{...existing,scene,seen:[...new Set([...seen,lesson.scenes[scene].id])]}}};
}
export function visitStoryScene(data:StoryProgress,id:string,scene:number):StoryProgress{
 const lesson=getStoryLesson(id);
 if(!lesson)return data;
 const n=Math.max(0,Math.min(lesson.scenes.length-1,Math.floor(scene)));
 const record=data.lessons[id]??{scene:0,seen:[]};
 return {...data,lessons:{...data.lessons,[id]:{...record,scene:n,seen:[...new Set([...record.seen,lesson.scenes[n].id])]}}};
}
export function completeStory(data:StoryProgress,id:string,completedAt:number):StoryProgress{
 const lesson=getStoryLesson(id);
 if(!lesson||!Number.isFinite(completedAt)||completedAt<=0)return data;
 const record=data.lessons[id]??{scene:0,seen:[]};
 return {...data,activeLesson:null,lessons:{...data.lessons,[id]:{...record,scene:lesson.scenes.length-1,seen:lesson.scenes.map(item=>item.id),completedAt:record.completedAt??completedAt}}};
}
export function closeStory(data:StoryProgress):StoryProgress{return {...data,activeLesson:null};}
export function seenCount(data:StoryProgress,id:string):number{return data.lessons[id]?.seen.length??0;}
export function completedStoryCount(data:StoryProgress):number{return storyLessons.filter(l=>Boolean(data.lessons[l.id]?.completedAt)).length;}
