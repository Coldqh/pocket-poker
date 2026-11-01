import {test,expect} from '@playwright/test';
async function createGame(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Настроить стол/i}).first().click();
 await page.getByRole('button',{name:'1 соперников'}).click();
 await page.getByRole('button',{name:'Играть',exact:true}).click();
 await expect(page.locator('.table-stage')).toBeVisible();
}
for(const size of [{width:320,height:568},{width:390,height:844}]){
 test(`review actions before and after on ${size.width}px`,async({page})=>{
  await page.setViewportSize(size);
  await createGame(page);
  await expect(page.locator('.action-fold')).toBeEnabled();
  await page.locator('.action-fold').click();
  await page.getByRole('button',{name:'История раздачи'}).click();
  await expect(page.locator('.review-root')).toBeVisible();
  await expect(page.locator('.review-step-heading')).toContainText('Ты: фолд');
  await expect(page.locator('.review-status')).toContainText('ДО ХОДА');
  await page.getByRole('button',{name:'После хода'}).click();
  await expect(page.locator('.review-status')).toContainText('ПОСЛЕ ХОДА');
  await expect(page.locator('.review-status')).toContainText('Внесено в банк: 0');
  await expect(page.locator('.review-player-list')).toBeHidden();
  await page.locator('.review-player-details summary').click();
  await expect(page.locator('.review-player-list>div')).toHaveCount(2);
 });
}
test('replay survives reload and is accessible through the laboratory',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await createGame(page);
 await page.locator('.action-fold').click();
 await page.reload();
 await page.getByRole('button',{name:'История раздачи'}).click();
 await expect(page.locator('.review-step-heading')).toContainText('Ты: фолд');
 await page.getByRole('button',{name:'Закрыть',exact:true}).last().click();
 await page.getByRole('button',{name:/На главную/i}).first().click();
 await page.getByRole('button',{name:'Истории',exact:true}).first().click();
 await expect(page.locator('.academy-screen')).toBeVisible();
});

test('IndexedDB archive restores older actions after compacting localStorage',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 // Reproducible REAL engine actions; a bot can otherwise fold before the hero
 // gets a chance to act, so tapping Fold four times is not a valid test setup.
 await page.evaluate(async()=>{
  const engine=await import('/src/engine.ts');
  let game=engine.newMatch(1);
  for(let i=0;i<4;i++){
   game=engine.act(game,game.actor,{kind:'fold'});
   if(i<3)game=engine.nextHand(game);
  }
  localStorage.setItem('pocket-v2-game',JSON.stringify(game));
  localStorage.setItem('pocket-v6-table-ready','true');
  localStorage.setItem('pocket-v3-page',JSON.stringify('play'));
 });
 await page.reload();
 await expect.poll(()=>page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem('pocket-v2-game')??'null');
  return !!s?.replayArchiveStored&&s.replayArchive?.length<=3;
 }),{timeout:15000}).toBe(true);
 const compact=await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-v2-game')));
 expect(compact.replayArchive.length).toBeLessThanOrEqual(3);
 await page.reload();
 await expect(page.locator('.table-stage')).toBeVisible();
 await page.getByRole('button',{name:'История раздачи'}).click();
 await expect(page.locator('.review-hand-list>button')).toHaveCount(4);
 await page.locator('.review-hand-list>button').last().click();
 await expect(page.locator('.review-step-heading')).toContainText('фолд');
 await expect(page.locator('.review-phase-picker')).toBeVisible();
});
