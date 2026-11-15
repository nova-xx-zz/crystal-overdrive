'use strict';
const {test, expect} = require('@playwright/test');

const sizes = [[320,568], [375,667], [390,844], [430,932], [568,320], [667,375], [844,390], [932,430]];

async function fixture(page, count) {
  await page.evaluate(count => {
    S.gameTurn=3;
    S.p.units=['risu','pen','saku','totsu'].map((id,i)=>({uid:100+i,id,cr:2,tired:false,attacked:false}));
    S.c.units=['risu','pen','saku','totsu'].map((id,i)=>({uid:200+i,id,cr:2,tired:false,attacked:false}));
    S.p.hand=DECK_LIST.slice(0,count);
    render();
  }, count);
}

async function checkLayout(page) {
  await expect.poll(()=>page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    const overlaps = (a,b) => Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
    const regions=['.arena-opponent','.arena-table','.arena-player'].map(rect);
    const rows=['.opponent-lane','.middle-panel','.player-lane'].map(rect);
    const errors=[];
    for(const group of [regions, rows]) {
      group.forEach((a,i)=>group.slice(i+1).forEach(b=>{if(overlaps(a,b)) errors.push('region overlap');}));
    }
    for(const button of document.querySelectorAll('.unit,.battle-footer button,.settings-menu')) {
      const r=button.getBoundingClientRect();
      if(r.width<44 || r.height<44) errors.push(`${button.className}: target ${r.width}x${r.height}`);
      if(r.left<0 || r.top<0 || r.right>innerWidth || r.bottom>innerHeight) errors.push(`${button.className}: outside viewport`);
      const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      if(top?.closest('button')!==button) errors.push(`${button.className}: covered at center`);
    }
    if(document.documentElement.scrollWidth>innerWidth) errors.push('page horizontal overflow');
    return errors;
  })).toEqual([]);
}

async function checkHandEnd(page, end) {
  await page.locator('.hand').evaluate((hand,end)=>{hand.scrollLeft=end ? hand.scrollWidth : 0;},end);
  // Wait for scroll-snap to settle before measuring the selected edge.
  const edge=page.locator('.hand .card')[end?'last':'first']();
  await expect.poll(()=>edge.evaluate(card=>{
    const h=card.parentElement.getBoundingClientRect(),r=card.getBoundingClientRect();
    const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return r.width>=44 && r.height>=44 && top?.closest('button')===card &&
      r.left>=h.left-1 && r.right<=h.right+1 && r.top>=h.top-1 && r.bottom<=h.bottom+1;
  })).toBe(true);
}

for(const [width,height] of sizes) {
  test(`縦横 ${width}x${height}: 満員盤面・0/1/4/10/20枚手札が操作領域を覆わない`, async ({page}, testInfo) => {
    await page.setViewportSize({width,height});
    const errors=[];
    page.on('pageerror', error=>errors.push(error.message));
    await page.goto('/');
    for(const count of [0,1,4,10,20]) {
      await fixture(page,count);
      await checkLayout(page);
      if(count) {
        await checkHandEnd(page,false);
        await checkHandEnd(page,true);
      }
    }
    await testInfo.attach('full-board-and-hand', {body:await page.screenshot(),contentType:'image/png'});
    await page.locator('.hand .card').last().click();
    await expect(page.locator('.detail.open')).toBeVisible();
    await page.locator('[data-act="dismissDetail"]').click();
    await page.locator('[data-act="menu"]').click();
    await page.locator('[data-act="catalog"]').click();
    await expect(page.locator('.catalog-card')).toHaveCount(12);
    await page.locator('[data-act="closeModal"]').click();
    await checkLayout(page);
    expect(errors).toEqual([]);
  });
}

test('スクロール位置を詳細開閉で維持し、新しい対戦では先頭へ戻す', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await fixture(page,20);
  await checkHandEnd(page,true);
  const before=await page.locator('.hand').evaluate(h=>h.scrollLeft);
  await page.locator('.hand .card').last().click();
  await expect(page.locator('.detail.open')).toBeVisible();
  await page.locator('[data-act="dismissDetail"]').click();
  expect(await page.locator('.hand').evaluate(h=>h.scrollLeft)).toBeCloseTo(before,0);
  await page.locator('[data-act="menu"]').click();
  await page.locator('[data-act="restart"]').click();
  expect(await page.locator('.hand').evaluate(h=>h.scrollLeft)).toBe(0);
});

test('先攻の案内、召喚、結晶操作、OD、対象指定、ブロック、再戦', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('先攻の1ターン目は攻撃できません');
  await page.locator('[data-act="toAttack"]').click();
  await expect(page.getByRole('status')).toContainText('ターン終了してください');
  await page.evaluate(()=>{S.p.hand=['risu','kudaki'];S.p.stock=10;render()});
  await page.locator('[data-act="hand"][data-i="0"]').click();
  await page.locator('[data-act="play"]').click();
  await expect(page.locator('.player-lane .unit')).toHaveCount(1);
  await page.locator('.player-lane .unit').click();
  await page.locator('[data-act="plus"]').click();
  await page.locator('[data-act="plus"]').click();
  await expect(page.locator('.player-lane .unit')).toHaveClass(/od/);
  expect(await page.evaluate(()=>S.p.units[0].cr)).toBe(3);
  await page.locator('[data-act="minus"]').click();
  expect(await page.evaluate(()=>S.p.units[0].cr)).toBe(2);
  await page.locator('[data-act="dismissDetail"]').click();
  await page.evaluate(()=>{S.c.units=[{uid:900,id:'pen',cr:3,tired:false,attacked:false}];render()});
  await page.locator('[data-act="hand"]').click();
  await page.locator('[data-act="play"]').click();
  await expect(page.locator('.opponent-lane .unit')).toHaveClass(/tgt/);
  await page.locator('.opponent-lane .unit').click();
  expect(await page.evaluate(()=>S.c.units[0].cr)).toBe(1);
  expect(await page.evaluate(()=>S.p.hand.length)).toBe(0);
  // Let the real CPU attack; selecting a block must release the waiting turn.
  await page.evaluate(()=>{S.p.units[0].tired=false;S.c.units[0].cr=4;S.c.hand=[];S.c.deck=['pen','risu'];S.c.stock=0;S.gameTurn=3;render()});
  await page.locator('[data-act="end"]').click();
  await expect(page.locator('[data-act="block"]').first()).toBeVisible({timeout:15000});
  await page.locator('[data-act="block"][data-uid=""]').click();
  await expect.poll(()=>page.evaluate(()=>S.active==='p'&&!S.busy),{timeout:15000}).toBe(true);
  await page.locator('[data-act="menu"]').click();
  await page.locator('[data-act="restart"]').click();
  expect(await page.evaluate(()=>({turn:S.gameTurn,life:S.p.life,units:S.p.units.length}))).toEqual({turn:1,life:5,units:0});
});

test('ブラウザの実操作でCPU戦が勝敗と再戦まで完走する', async ({page}) => {
  await page.setViewportSize({width:844,height:390});
  await page.addInitScript(()=>{
    let seed=20261031;
    Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const timer=window.setTimeout.bind(window);
    window.setTimeout=(fn,ms,...args)=>timer(fn,Math.min(ms,20),...args);
  });
  await page.goto('/');
  for(let turn=0;turn<50 && !await page.evaluate(()=>S.over);turn++) {
    // Use displayed playable cards; fixture injection is not used in this match.
    for(let i=0;i<10 && !await page.evaluate(()=>S.over);i++) {
      const playable=page.locator('.hand .card:not(.dim)').first();
      if(!await playable.count()) break;
      await playable.click();
      await page.locator('[data-act="play"]').click();
      if(await page.locator('.unit.tgt').count()) await page.locator('.unit.tgt').first().click();
    }
    if(await page.locator('.detail.open').count()) await page.locator('[data-act="dismissDetail"]').click();
    if(await page.evaluate(()=>S.over)) break;
    if(await page.evaluate(()=>S.gameTurn>1)) {
      await page.locator('[data-act="toAttack"]').click();
      const attackers=await page.locator('.player-lane .unit:not(.tired)').evaluateAll(es=>es.map(e=>e.dataset.uid));
      for(const uid of attackers) {
        if(await page.evaluate(()=>S.over)) break;
        const unit=page.locator(`.player-lane .unit[data-uid="${uid}"]`);
        if(!await unit.count()) continue;
        await unit.click();
        await page.locator('[data-act="atk"]').click();
        await expect.poll(()=>page.evaluate(()=>!S.busy||!!S.over)).toBe(true);
      }
    }
    if(await page.evaluate(()=>S.over)) break;
    await page.locator('[data-act="end"]').click();
    for(let wait=0;wait<500;wait++) {
      if(await page.locator('[data-act="block"]').count()) await page.locator('[data-act="block"][data-uid=""]').click();
      if(await page.evaluate(()=>S.over || S.active==='p'&&!S.busy)) break;
      await page.waitForTimeout(20);
    }
    expect(await page.evaluate(()=>S.over || S.active==='p'&&!S.busy)).toBeTruthy();
  }
  expect(await page.evaluate(()=>S.over)).toMatch(/^[pc]$/);
  await expect(page.locator('#modal-root')).toContainText(/勝利|敗北/);
  await page.locator('[data-act="restart"]').click();
  expect(await page.evaluate(()=>S.gameTurn)).toBe(1);
});

test('回転とノッチ相当の余白を確保しても操作が重ならない', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  // CSS injection tests the layout budget, not a claim of real iPhone safe-area support.
  await page.addStyleTag({content:'@media(orientation:portrait){.arena-mode{padding:47px 6px 34px}}@media(orientation:landscape){.arena-mode{padding:0 47px 21px}}'});
  await fixture(page,20);
  await checkLayout(page);
  const match=await page.evaluate(()=>S.gid);
  await page.setViewportSize({width:844,height:390});
  await checkLayout(page);
  await checkHandEnd(page,true);
  expect(await page.evaluate(()=>S.gid)).toBe(match);
});
