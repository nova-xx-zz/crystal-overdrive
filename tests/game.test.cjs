'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// HTMLで指定された順に外部スクリプトを読み込む。Nodeではブラウザを起動せずテストする。
const WEB_DIR = path.join(__dirname, '..', 'web');
const html = fs.readFileSync(path.join(WEB_DIR, 'index.html'), 'utf8');
const scriptSources = [...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g)]
  .map(match => match[1]);
const expectedScripts = ['./cards.js', './game.js', './ui.js'];
if (JSON.stringify(scriptSources) !== JSON.stringify(expectedScripts)) {
  throw new Error('Web版のスクリプト読み込み順が想定と異なります');
}

function boot() {
  const timers = [];
  const elements = new Map();
  const handlers = {};
  const document = {
    addEventListener(event, handler) { handlers[event] = handler; },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { innerHTML: '' });
      return elements.get(id);
    },
  };
  const context = vm.createContext({
    document,
    setTimeout(callback) { timers.push(callback); },
  });
  for (const src of scriptSources) {
    const filename = path.join(WEB_DIR, src);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename: src });
  }
  return {
    timers,
    run: (code) => vm.runInContext(code, context),
    html: (id) => elements.get(id)?.innerHTML || '',
    click(act, attrs = {}) {
      return handlers.click({
        target: { closest: (selector) =>
          selector === '[data-act]' ? { dataset: { act, ...attrs } } : null },
      });
    },
  };
}

test('対戦開始時のライフ・結晶・デッキ枚数', () => {
  const { run } = boot();
  assert.equal(run('S.p.life'), 5);
  assert.equal(run('S.c.life'), 5);
  assert.equal(run('S.p.stock'), 4); // 初期3＋先攻ターン開始時1
  assert.equal(run('S.p.hand.length'), 4);
  assert.equal(run('S.p.deck.length'), 16);
  assert.equal(run('S.active'), 'p');
});

test('召喚時はコストと配置用結晶を消費する', () => {
  const { run } = boot();
  run("S.p.hand=['risu']; S.p.stock=4; playCard('p',0);");
  assert.equal(run('S.p.stock'), 2); // コスト1＋配置1
  assert.equal(run('S.p.hot'), 1);
  assert.equal(run('S.p.units.length'), 1);
  assert.equal(run('S.p.units[0].cr'), 1);
  assert.equal(run('S.p.hand.length'), 0);
});

test('結晶破壊で中央プールに移動し、0個のユニットは退場する', () => {
  const { run } = boot();
  run("S.c.units=[{uid:99,id:'risu',cr:2,tired:false,attacked:false}]; removeToPool('c',S.c.units[0],2);");
  assert.equal(run('S.pool'), 2);
  assert.equal(run('S.c.units.length'), 0);
  assert.equal(run('S.c.cool'), 0); // 中央へ移した結晶を二重計上しない
});

test('ターン開始で冷却が1段階進み、劣勢側が中央プールから獲得する', () => {
  const { run } = boot();
  run('S.gameTurn=2; S.p.stock=1; S.p.cool=2; S.p.hot=3; S.p.life=3; S.c.life=5; S.pool=2; startTurn("p");');
  assert.equal(run('S.p.stock'), 5); // 手元1＋冷めた2＋通常1＋劣勢1
  assert.equal(run('S.p.cool'), 3);
  assert.equal(run('S.p.hot'), 0);
  assert.equal(run('S.pool'), 1);
  assert.equal(run('S.p.hand.length'), 5);
});

test('オーバードライブの反動で結晶が熱くなりユニットが退場する', () => {
  const { run } = boot();
  run("S.p.units=[{uid:99,id:'risu',cr:4,tired:false,attacked:false}]; endTurn();");
  assert.equal(run('S.p.hot'), 4); // 上限2を2個超過＋反動2個
  assert.equal(run('S.p.units.length'), 0);
  assert.equal(run('S.gameTurn'), 2);
});

test('対戦再開始後に古いCPUの待機処理が新しい対戦を操作しない', async () => {
  const { run, timers } = boot();
  run('cpuTurn()');
  assert.equal(timers.length, 1); // CPUの思考待機中
  run("newGame(); S.c.hand=['risu']; S.c.stock=4;");
  timers.shift()(); // 古いCPUの待機を解除
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(run('S.c.units.length'), 0);
  assert.equal(run('S.busy'), false);
  assert.equal(run('S.active'), 'p');
});


test('対象のいないマジックは使用できず、手札や結晶を消費しない', () => {
  const { run } = boot();
  run("S.p.hand=['kudaki']; S.p.stock=10;");
  assert.equal(run("canPlay('p',0)"), false);
  assert.equal(run("canPlay('p',99)"), false, '存在しない手札番号は操作不可');
  assert.equal(run("playCard('p',0,99)"), false);
  assert.equal(run('S.p.stock'), 10);
  assert.equal(run('S.p.hand.length'), 1);
  assert.match(run("S.sel={kind:'hand',i:0}; detailHTML()"), /対象となる相手ユニットがいません/);
});

test('対象UIDの照合後のみ、結晶砕きの効果とコストが発生する', () => {
  const { run } = boot();
  run("S.p.hand=['kudaki']; S.p.stock=10; S.c.units=[{uid:99,id:'risu',cr:2,tired:false,attacked:false}];");
  assert.equal(run("canPlay('p',0)"), true);
  assert.equal(run("playCard('p',0,999)"), false);
  assert.equal(run('S.p.stock'), 10);
  assert.equal(run("playCard('p',0,99)"), true);
  assert.equal(run('S.p.stock'), 7);
  assert.equal(run('S.p.hot'), 3);
  assert.equal(run('S.pool'), 2);
  assert.equal(run('S.c.units.length'), 0);
});

test('カード一覧で全12種と効果を確認して閉じられる', async () => {
  const { run, click, html } = boot();
  await click('catalog');
  assert.equal(run('S.modal'), 'catalog');
  const modal = html('modal-root');
  assert.equal((modal.match(/class="catalog-card /g) || []).length, 12);
  assert.match(modal, /火花リス/);
  assert.match(modal, /補給線/);
  assert.match(modal, /オーバードライブ|OD：/);
  await click('closeModal');
  assert.equal(run('S.modal'), null);
});

test('カードを選択して対象ユニットを指定するとマジックが適用される', async () => {
  const { run, click } = boot();
  run("S.p.hand=['kiri']; S.p.stock=10; S.c.units=[{uid:99,id:'risu',cr:2,tired:false,attacked:false}]; S.sel={kind:'hand',i:0};");
  await click('play');
  assert.equal(run('S.targeting.i'), 0);
  await click('unit', { side: 'c', uid: '99' });
  assert.equal(run('S.targeting'), null);
  assert.equal(run('S.c.units[0].tired'), true);
  assert.equal(run('S.p.stock'), 8);
  assert.equal(run('S.p.hot'), 2);
});

test('HTMLがCSSとスクリプト3本を正しい順で参照している', () => {
  assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css">/);
  assert.deepEqual(scriptSources, ['./cards.js', './game.js', './ui.js']);
  assert.match(fs.readFileSync(path.join(WEB_DIR, 'styles.css'), 'utf8'), /\.unit\.od/);
  assert.doesNotMatch(html, /<script>([\s\S]*?)<\/script>/);
});

test('カード定義と対戦処理を画面なしで読み込める', () => {
  const context = vm.createContext({});
  for (const src of ['./cards.js', './game.js']) {
    vm.runInContext(fs.readFileSync(path.join(WEB_DIR, src), 'utf8'), context, { filename: src });
  }
  assert.equal(vm.runInContext("power({id:'risu', cr:1})", context), 2);
  assert.equal(vm.runInContext("power({id:'risu', cr:2})", context), 3);
  assert.equal(vm.runInContext("power({id:'risu', cr:3})", context), 5);
});

test('分離後も起動時に対戦画面が初期描画される', () => {
  const { html: getHTML } = boot();
  assert.match(getHTML('app'), /結晶オーバードライブ/);
  assert.match(getHTML('app'), /攻撃フェイズへ/);
  assert.match(getHTML('app'), /中央プール/);
});

test('カード選択・ユニット選択にaria-pressedが付く', () => {
  const { run, html: getHTML } = boot();
  run("S.p.hand=['risu']; S.sel={kind:'hand',i:0}; render();");
  assert.match(getHTML('app'), /data-act="hand" data-i="0" aria-pressed="true"/);
  run("S.p.units=[{uid:99,id:'risu',cr:2,tired:false,attacked:false}]; S.sel={kind:'unit',side:'p',uid:99}; render();");
  assert.match(getHTML('app'), /data-act="unit" data-side="p" data-uid="99" aria-pressed="true"/);
});

test('マジック対象指定時に対象ボタンの音声ラベルへ案内を追加する', () => {
  const { run, html: getHTML } = boot();
  run("S.p.hand=['kiri']; S.c.units=[{uid:99,id:'risu',cr:2,tired:false,attacked:false}]; S.targeting={i:0}; render();");
  assert.match(getHTML('app'), /aria-label="火花リス パワー3 対象に指定"/);
});

test('iPhone用CSSに下部固定操作・セーフエリア・タップ領域を設定する', () => {
  const styles = fs.readFileSync(path.join(WEB_DIR, 'styles.css'), 'utf8');
  assert.match(styles, /\.actions\{position:sticky;bottom:0;/);
  assert.match(styles, /safe-area-inset-top/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(styles, /\.choice\{[^}]*min-height:52px/);
  assert.match(styles, /\.btn\{[^}]*min-height:44px/);
});

test('CPUは防御可能なら最小限のパワーで有利なブロックを行う', () => {
  const { run } = boot();
  run("S.c.units=[{uid:31,id:'koke',cr:5,tired:false,attacked:false},{uid:32,id:'pen',cr:2,tired:false,attacked:false}];");
  assert.equal(run("cpuChooseBlock({uid:41,id:'risu',cr:1}).uid"), 32);
});

test('CPUは致死ダメージを安価なユニットでブロックしライフを守る', () => {
  const { run } = boot();
  run("S.c.life=1; S.c.units=[{uid:30,id:'shimo',cr:1,tired:false,attacked:false},{uid:32,id:'pen',cr:1,tired:false,attacked:false}];");
  assert.equal(run("cpuChooseBlock({uid:41,id:'volga',cr:4}).uid"), 32);
});

test('CPUは結晶を払えないOD候補を除外する', () => {
  const { run } = boot();
  run("S.c.units=[{uid:31,id:'volga',cr:1,tired:false,attacked:false},{uid:32,id:'totsu',cr:3,tired:false,attacked:false}];");
  assert.equal(run("cpuOverdriveChoice(1,2,[],0.9).u.uid"), 32);
  assert.equal(run("cpuOverdriveChoice(0,2,[],0.1)"), null);
});

test('CPUはODで直接決着を狙えるユニットを優先する', () => {
  const { run } = boot();
  run("S.c.units=[{uid:31,id:'volga',cr:4,tired:false,attacked:false},{uid:32,id:'totsu',cr:3,tired:false,attacked:false}];");
  assert.equal(run("cpuOverdriveChoice(2,2,[],0.8).u.uid"), 32);
});

test('CPUのOD判断は非緊急時の抽選と疲労状態を考慮する', () => {
  const { run } = boot();
  run("S.c.units=[{uid:31,id:'totsu',cr:3,tired:false,attacked:false}];");
  assert.equal(run("cpuOverdriveChoice(1,5,[],0.9)"), null);
  assert.equal(run("cpuOverdriveChoice(1,5,[],0.1).u.uid"), 31);
  run('S.c.units[0].tired=true;');
  assert.equal(run("cpuOverdriveChoice(1,2,[],0.1)"), null);
});

test('CPUのOD候補選択自体は結晶やユニットの状態を変更しない', () => {
  const { run } = boot();
  run("S.c.units=[{uid:31,id:'totsu',cr:3,tired:false,attacked:false}]; S.c.stock=2;");
  run("cpuOverdriveChoice(S.c.stock,2,[],0.5);");
  assert.equal(run('S.c.stock'), 2);
  assert.equal(run('S.c.units[0].cr'), 3);
});
