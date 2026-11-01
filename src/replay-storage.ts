import type {HandReplay} from './engine.ts';

/** Persistent archive of completed hands, kept outside the localStorage game snapshot. */
const DB_NAME='pocket-replay-archive';
const STORE_NAME='hands';
const DB_VERSION=1;
export type ArchiveRecord={matchId:string;version:1;updatedAt:number;hands:HandReplay[]};

function openDB():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(new Error('IndexedDB unavailable'));return;}
  let request:IDBOpenDBRequest;
  try{request=indexedDB.open(DB_NAME,DB_VERSION);}
  catch(e){reject(e);return;}
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME,{keyPath:'matchId'});
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error??new Error('IndexedDB open failed'));
  request.onblocked=()=>reject(new Error('IndexedDB upgrade blocked'));
 });
}
export async function writeReplayArchive(matchId:string,hands:HandReplay[]):Promise<void>{
 const db=await openDB();
 try{
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE_NAME,'readwrite');
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error??new Error('Archive transaction failed'));
   tx.onabort=()=>reject(tx.error??new Error('Archive transaction aborted'));
   tx.objectStore(STORE_NAME).put({
     matchId,version:1,updatedAt:Date.now(),hands:hands.slice(-25)
   } satisfies ArchiveRecord);
  });
 }finally{db.close();}
}
export async function readReplayArchive(matchId:string):Promise<HandReplay[]|null>{
 const db=await openDB();
 try{
  return await new Promise<HandReplay[]|null>((resolve,reject)=>{
   const tx=db.transaction(STORE_NAME,'readonly');
   const req=tx.objectStore(STORE_NAME).get(matchId);
   req.onsuccess=()=>{
    const record=req.result as ArchiveRecord|undefined;
    resolve(record?.version===1&&Array.isArray(record.hands)?record.hands:null);
   };
   req.onerror=()=>reject(req.error??new Error('Archive read failed'));
   tx.onabort=()=>reject(tx.error??new Error('Archive read aborted'));
  });
 }finally{db.close();}
}
export function mergeReplayArchives(stored:HandReplay[],recent:HandReplay[]):HandReplay[]{
 const map=new Map<number,HandReplay>();
 for(const h of [...stored,...recent]){
  if(h&&Number.isSafeInteger(h.number)&&Array.isArray(h.frames))map.set(h.number,h);
 }
 return [...map.values()].sort((a,b)=>a.number-b.number).slice(-25);
}
