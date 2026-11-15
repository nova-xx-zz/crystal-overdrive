'use strict';
const {test,expect}=require('@playwright/test');

// CDP sends real browser input. Dispatching DOM TouchEvents or assigning
// scrollLeft would not verify native gesture recognition / touch-action.
async function swipe(page,cdp,direction){
  const box=await page.locator('.hand').boundingBox();
  const start=direction==='left'?box.x+box.width-45:box.x+45;
  const end=direction==='left'?box.x+45:box.x+box.width-45;
  const y=box.y+box.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y,id:0}]});
  for(let i=1;i<=12;i++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*i/12,y,id:0}]});
    await page.waitForTimeout(25);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}

const position=page=>page.locator('.hand').evaluate(h=>({left:h.scrollLeft,max:h.scrollWidth-h.clientWidth}));

test('4枚が収まる手札はスワイプで動かず、誤ってカードも選択しない',async({page,context})=>{
  await page.goto('/');
  expect((await position(page)).max).toBe(0);
  const cdp=await context.newCDPSession(page);
  await swipe(page,cdp,'left');
  await swipe(page,cdp,'right');
  expect((await position(page)).left).toBe(0);
  expect(await page.evaluate(()=>S.sel)).toBeNull();
  await page.locator('.hand .card').last().tap();
  await expect(page.locator('.detail.open')).toBeVisible();
});

for(const count of [5,20]){
  test(`${count}枚を実スワイプで両端まで動かし、詳細表示・召喚できる`,async({page,context})=>{
    await page.goto('/');
    // UI fixture; full legal games remain covered separately in battle.spec.cjs.
    await page.evaluate(count=>{S.p.hand=DECK_LIST.slice(0,count).reverse();S.p.stock=30;render()},count);
    expect((await position(page)).max).toBeGreaterThan(0);
    const cdp=await context.newCDPSession(page);
    async function reachEnd(direction){
      for(let tries=0;tries<12;tries++){
        const p=await position(page);
        if(direction==='left'?p.left>=p.max-1:p.left<=1)break;
        await swipe(page,cdp,direction);
        await expect.poll(async()=>{
          const next=await position(page);
          return direction==='left'?next.left>p.left+1:next.left<p.left-1;
        }).toBe(true);
      }
      await expect.poll(async()=>{
        const p=await position(page);return direction==='left'?p.max-p.left:p.left;
      }).toBeLessThanOrEqual(1);
      expect(await page.evaluate(()=>S.sel)).toBeNull();
    }
    await reachEnd('left');
    await page.locator('.hand .card').last().tap();
    expect(await page.evaluate(()=>S.sel.i)).toBe(count-1);
    await expect(page.locator('.detail.open')).toContainText('火花リス');
    await page.locator('[data-act="dismissDetail"]').tap();
    await reachEnd('right');
    await page.locator('.hand .card').first().tap();
    expect(await page.evaluate(()=>S.sel.i)).toBe(0);
    await page.locator('[data-act="dismissDetail"]').tap();
    await reachEnd('left');
    await page.locator('.hand .card').last().tap();
    await page.locator('[data-act="play"]').tap();
    expect(await page.evaluate(()=>S.p.units[0].id)).toBe('risu');
    expect(await page.evaluate(()=>S.p.hand.length)).toBe(count-1);
  });
}
