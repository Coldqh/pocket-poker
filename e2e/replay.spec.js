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
 await createGame(page);
 for(let i=0;i<4;i++){
  await expect(page.locator('.action-fold')).toBeEnabled({timeout:10000});
  await page.locator('.action-fold').click();
  if(i<3)await page.getByRole('button',{name:/Следующая раздача/}).click();
 }
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
