'use strict';
const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const KEY='crystal-overdrive.profile.v1';
async function openDecks(page){
  await page.locator('[data-act="menu"]').click();
  await page.locator('[data-act="decks"]').click();
}
const entry=(page,id)=>page.locator(`.deck-entry[data-card-id="${id}"]`);

for(const [width,height] of [[320,568],[844,390]]){
  test(`デッキ編集・検索・20枚保存・再読込・選択対戦 ${width}x${height}`,async({page},testInfo)=>{
    await page.setViewportSize({width,height});
    await page.goto('/');await openDecks(page);
    await page.locator('[data-act="deckDuplicate"]').click();
    await page.locator('[data-deck-field="name"]').fill('青赤の試作デッキ');
    await entry(page,'volga').locator('[data-act="deckRemoveCard"]').click();
    await entry(page,'volga').locator('[data-act="deckRemoveCard"]').click();
    await page.locator('[data-deck-field="type"]').selectOption('spell');
    await expect(page.locator('.deck-entry')).toHaveCount(4);
    await page.locator('[data-deck-field="attr"]').selectOption('b');
    await expect(page.locator('.deck-entry')).toHaveCount(2);
    await page.locator('[data-deck-field="search"]').fill('冷却');
    await expect(page.locator('.deck-entry')).toHaveCount(1);
    await entry(page,'reikyaku').locator('[data-act="deckAddCard"]').click();
    await expect(entry(page,'reikyaku').locator('[data-act="deckAddCard"]')).toBeDisabled();
    await page.locator('[data-deck-field="search"]').fill('');
    await page.locator('[data-deck-field="attr"]').selectOption('r');
    await entry(page,'kudaki').locator('[data-act="deckAddCard"]').click();
    await expect(page.locator('.deck-sticky')).toContainText('20 / 20枚');
    await testInfo.attach('deck-editor',{body:await page.screenshot(),contentType:'image/png'});
    await page.locator('[data-act="deckSave"]').click();
    await expect(page.locator('.deck-summary')).toHaveCount(2);
    await expect(page.locator('.deck-list')).toContainText('青赤の試作デッキ');
    await page.reload();
    const cards=await page.evaluate(()=>[...S.p.deck,...S.p.hand]);
    expect(cards).not.toContain('volga');
    expect(cards.filter(id=>id==='reikyaku')).toHaveLength(2);
    expect(cards.filter(id=>id==='kudaki')).toHaveLength(2);
    expect(cards).toHaveLength(20);
    await openDecks(page);
    const generation=await page.evaluate(()=>S.gid);
    await page.locator('[data-act="deckStart"]').click();
    expect(await page.evaluate(()=>S.gid)).toBe(generation+1);
    expect(await page.evaluate(()=>S.c.deck.length+S.c.hand.length)).toBe(20);
  });
}

test('編集中デッキの開始拒否・削除確認・最後のデッキ削除',async({page})=>{
  await page.goto('/');await openDecks(page);
  await page.locator('[data-act="deckNew"]').click();
  await page.locator('[data-deck-field="name"]').fill('<img src=x onerror=alert(1)>');
  await page.locator('[data-act="deckSave"]').click();
  await expect(page.locator('[data-act="deckStart"]')).toBeDisabled();
  await expect(page.locator('.deck-list img')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('dialog',{name:'保存デッキ'})).toBeVisible();
  await page.locator('.deck-summary').last().locator('[data-act="deckDelete"]').click();
  await page.locator('[data-act="deckCancelDelete"]').click();
  await expect(page.locator('.deck-summary')).toHaveCount(2);
  await page.locator('.deck-summary').last().locator('[data-act="deckDelete"]').click();
  await page.locator('[data-act="deckConfirmDelete"]').click();
  await expect(page.locator('[data-act="deckStart"]')).toBeEnabled();
  await page.locator('[data-act="deckDelete"]').click();
  await page.locator('[data-act="deckConfirmDelete"]').click();
  await expect(page.locator('.deck-summary')).toHaveCount(0);
  await expect(page.locator('[data-act="deckStart"]')).toBeDisabled();
});

test('保存失敗時は編集内容を残し、保存成功と表示しない',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('full','QuotaExceededError')};});
  await page.goto('/');await openDecks(page);
  await page.locator('[data-act="deckEdit"]').click();
  await page.locator('[data-deck-field="name"]').fill('消さない編集内容');
  await page.locator('[data-act="deckSave"]').click();
  await expect(page.getByRole('dialog',{name:'デッキ編集'})).toBeVisible();
  await expect(page.locator('[data-deck-field="name"]')).toHaveValue('消さない編集内容');
  await expect(page.locator('.deck-notice')).toContainText('保存できませんでした');
  expect(await page.evaluate(key=>localStorage.getItem(key),KEY)).toBeNull();
  await page.locator('[data-act="deckCancel"]').click();
  await page.locator('[data-act="deckDelete"]').click();
  await page.locator('[data-act="deckConfirmDelete"]').click();
  await expect(page.getByRole('dialog',{name:'デッキ削除の確認'})).toBeVisible();
  await expect(page.locator('.deck-notice')).toContainText('保存できませんでした');
  expect(await page.evaluate(()=>deckStore.getProfile().decks.length)).toBe(1);
});

test('破損した保存を保護し、元データをバックアップできる',async({page})=>{
  await page.addInitScript(key=>localStorage.setItem(key,'{broken'),KEY);
  await page.goto('/');await openDecks(page);
  await expect(page.locator('.deck-notice')).toContainText('既存データを保護');
  const download=page.waitForEvent('download');
  await page.locator('[data-act="deckBackup"]').click();
  const file=await download;
  expect(await fs.readFile(await file.path(),'utf8')).toBe('{broken');
  await page.locator('[data-act="deckEdit"]').click();
  await page.locator('[data-act="deckSave"]').click();
  await expect(page.locator('.deck-notice')).toContainText('既存データを保護');
  expect(await page.evaluate(key=>localStorage.getItem(key),KEY)).toBe('{broken');
});

test('別の画面で更新された保存を古い編集が上書きしない',async({page,context})=>{
  await page.goto('/');
  const second=await context.newPage();await second.goto('/');
  await openDecks(page);await page.locator('[data-act="deckEdit"]').click();
  await page.locator('[data-deck-field="name"]').fill('先に保存');await page.locator('[data-act="deckSave"]').click();
  await openDecks(second);await second.locator('[data-act="deckEdit"]').click();
  await second.locator('[data-deck-field="name"]').fill('古い画面の編集');await second.locator('[data-act="deckSave"]').click();
  await expect(second.locator('.deck-notice')).toContainText('別の画面');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).decks[0].name,KEY)).toBe('先に保存');
});
