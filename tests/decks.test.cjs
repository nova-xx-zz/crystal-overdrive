'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {KEY,validateDeck,initialProfile,createStore}=require('../web/decks.js');
const read=file=>fs.readFileSync(path.join(__dirname,'../web',file),'utf8');
const context=vm.createContext({});
vm.runInContext(read('cards.js'),context);
const {master,starter}=JSON.parse(vm.runInContext('JSON.stringify({master:CARDS,starter:DECK_LIST})',context));
const alternate=starter.filter(id=>id!=='volga').concat('reikyaku','kudaki');
function storage(raw=null){
  let value=raw;
  return {getItem:key=>key===KEY?value:null,setItem(key,next){assert.equal(key,KEY);value=next;},raw:()=>value};
}
const store=storage=>createStore({master,starter,storage});

test('20枚・同名2枚・不明ID・所持不足を構造化して検証する',()=>{
  assert.equal(validateDeck(starter,master).valid,true);
  assert.equal(validateDeck(alternate,master).valid,true);
  for(const cards of [starter.slice(0,19),starter.concat('kiri')])assert.ok(validateDeck(cards,master).errors.some(e=>e.code==='size'));
  assert.ok(validateDeck(['constructor',...starter.slice(1)],master).errors.some(e=>e.code==='unknown'));
  assert.ok(validateDeck(['risu',...starter.slice(0,19)],master).errors.some(e=>e.code==='copies'));
  const counts=initialProfile(master,starter).collection.counts;counts.risu=1;
  assert.ok(validateDeck(starter,master,counts).errors.some(e=>e.code==='owned'));
  assert.equal(validateDeck(null,master).valid,false);
});

test('マスター・所持・デッキ・返却値を相互に変更しない',()=>{
  const s=store(storage()),a=s.getProfile();
  a.decks[0].cards.pop();a.collection.counts.risu=0;
  assert.equal(s.getProfile().decks[0].cards.length,20);
  assert.equal(s.getProfile().collection.counts.risu,2);
  assert.equal(master.risu.count,undefined);
  const draft={id:'custom',name:'別デッキ',cards:alternate.slice()};
  assert.equal(s.saveDeck(draft).ok,true);draft.cards.pop();
  assert.equal(s.getProfile().decks[1].cards.length,20);
});

test('複数保存・選択・名称編集・再読み込みを保持する',()=>{
  const data=storage(),s=store(data);
  assert.equal(s.saveDeck({id:'custom',name:'軽量デッキ',cards:alternate}).ok,true);
  assert.equal(s.selectDeck('starter').ok,true);
  assert.equal(s.saveDeck({id:'starter',name:'<名前を安全に表示>',cards:starter}).ok,true);
  const restored=store(data).getProfile();
  assert.equal(restored.activeDeckId,'starter');
  assert.equal(restored.decks.length,2);
  assert.equal(restored.decks[0].name,'<名前を安全に表示>');
  assert.deepEqual(restored.decks[1].cards,alternate);
  assert.equal(restored.revision,3);
});

test('不足枚数の編集中デッキは保存でき、対戦検証は拒否する',()=>{
  const s=store(storage());
  assert.equal(s.saveDeck({id:'draft',name:'編集中',cards:starter.slice(0,19)}).ok,true);
  assert.equal(validateDeck(s.getProfile().decks[1].cards,master).valid,false);
});

test('削除した選択を修復し、全削除後は選択なしにする',()=>{
  const s=store(storage());
  s.saveDeck({id:'custom',name:'別デッキ',cards:alternate});
  assert.equal(s.removeDeck('custom').ok,true);
  assert.equal(s.getProfile().activeDeckId,'starter');
  assert.equal(s.removeDeck('starter').ok,true);
  assert.equal(s.getProfile().activeDeckId,null);
  assert.equal(s.selectDeck('missing').ok,false);
  assert.equal(s.removeDeck('missing').ok,false);
});

test('保存上限・不明カード・空名・不正IDを拒否する',()=>{
  const s=store(storage());
  for(const d of [{id:'bad/id',name:'名前',cards:[]},{id:'ok',name:' ',cards:[]},{id:'ok',name:'名前',cards:['missing']}])assert.equal(s.saveDeck(d).ok,false);
  for(let i=0;i<29;i++)assert.equal(s.saveDeck({id:'d'+i,name:'デッキ',cards:[]}).ok,true);
  assert.equal(s.saveDeck({id:'extra',name:'上限超過',cards:[]}).ok,false);
});

test('保存領域がない/読めない場合は成功を返さない',()=>{
  for(const data of [null,{getItem(){throw new Error('SecurityError')}}]){
    const s=store(data);assert.equal(s.saveDeck({id:'new',name:'名前',cards:[]}).ok,false);
    assert.equal(s.getProfile().decks[0].cards.length,20);
  }
});

test('QuotaExceededで旧保存・メモリ・呼び出し元の編集内容を保持する',()=>{
  const data=storage(),s=store(data);s.selectDeck('starter');
  const before=data.raw(),profile=s.getProfile(),draft={id:'new',name:'名前',cards:alternate.slice()};
  data.setItem=()=>{throw new Error('QuotaExceededError')};
  assert.equal(s.saveDeck(draft).ok,false);
  assert.equal(data.raw(),before);assert.deepEqual(s.getProfile(),profile);assert.deepEqual(draft.cards,alternate);
});

test('破損・将来版・不正な所有数・重複ID・大きすぎる保存を上書きしない',()=>{
  const valid=initialProfile(master,starter);
  const cases=['{broken',JSON.stringify({...valid,schemaVersion:2}),JSON.stringify({...valid,schemaVersion:0}),
    JSON.stringify({...valid,collection:{source:'offline-starter',counts:{risu:-1}}}),JSON.stringify({...valid,decks:[valid.decks[0],valid.decks[0]]}), ' '.repeat(100001)];
  for(const raw of cases){const data=storage(raw),s=store(data);assert.equal(s.saveDeck({id:'x',name:'名前',cards:[]}).ok,false);assert.equal(data.raw(),raw);assert.equal(s.backup(),raw);}
});

test('別画面による更新を検出し、新しい保存を上書きしない',()=>{
  const data=storage(),a=store(data),b=store(data);
  a.saveDeck({id:'a',name:'先の保存',cards:alternate});const saved=data.raw();
  const result=b.saveDeck({id:'b',name:'古い画面',cards:starter});
  assert.equal(result.ok,false);assert.match(result.message,/別の画面/);assert.equal(data.raw(),saved);
});

test('選択デッキはコピーして対戦へ渡し、CPUや保存を変えない',()=>{
  const ctx=vm.createContext({render(){}});
  for(const file of ['cards.js','decks.js','game.js'])vm.runInContext(read(file),ctx);
  vm.runInContext(`const supplied=${JSON.stringify(alternate)};newGame(supplied)`,ctx);
  const played=JSON.parse(vm.runInContext('JSON.stringify([...S.p.deck,...S.p.hand])',ctx));
  assert.deepEqual(played.sort(),alternate.slice().sort());
  const cpu=JSON.parse(vm.runInContext('JSON.stringify([...S.c.deck,...S.c.hand])',ctx));
  assert.deepEqual(cpu.sort(),starter.slice().sort());
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(supplied)',ctx)),alternate);
  const before=vm.runInContext('JSON.stringify(S)',ctx);
  assert.throws(()=>vm.runInContext('newGame(supplied.slice(1))',ctx),/有効な20枚/);
  assert.equal(vm.runInContext('JSON.stringify(S)',ctx),before);
});
