'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

function boot() {
  const elements = new Map();
  const handlers = {};
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { innerHTML: '' });
      return elements.get(id);
    },
    addEventListener(type, handler) { handlers[type] = handler; },
  };
  const context = vm.createContext({ document, setTimeout() {} });
  for (const file of ['cards.js', 'game.js', 'ui.js']) {
    vm.runInContext(read('web/' + file), context, { filename: file });
  }
  return {
    run(code) { return vm.runInContext(code, context); },
    html(id = 'app') { return elements.get(id)?.innerHTML || ''; },
    async tap(act, attrs = {}) {
      await handlers.click({
        target: { closest(selector) { return selector === '[data-act]' ? { dataset: { act, ...attrs } } : null; } },
      });
    },
  };
}

test('Capacitor起動先はラフ画準拠の正式UIを参照し、素材はアプリへ同梱される', () => {
  const html = read('web/index.html');
  assert.match(html, /<link rel="stylesheet" href=".\/styles.css">/);
  assert.match(html, /<link rel="stylesheet" href=".\/ios-battle.css">/);
  assert.match(html, /viewport-fit=cover/);
  assert.doesNotMatch(read('web/ui.js'), /https?:\/\//, 'カードの図形は外部取得せずSVGで描画');
});

test('縦と横で盤面位置を再配置し、Safe Areaを確保する', () => {
  const css = read('web/ios-battle.css');
  assert.match(css, /@media\(orientation:landscape\)/);
  assert.match(css, /@media\(orientation:portrait\)/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.field \.landscape-extra\{display:none\}/);
  assert.match(css, /\.landscape-extra\{display:flex\}/);
  assert.match(css, /\.hand\{[^}]*overflow-x:auto/);
  assert.match(css, /\.detail\.open\{display:flex\}/);
});

test('本番UIは上下プレイヤー・場・手札・設定・終了ボタンを描画する', () => {
  const { html } = boot();
  const out = html();
  for (const selector of ['opponent-panel', 'opponent-lane', 'middle-panel', 'player-lane',
    'player-panel', 'hand-box', 'battle-footer', 'card-art']) assert.ok(out.includes(selector), selector);
  assert.match(out, /設定メニュー/);
  assert.match(out, /攻撃フェイズへ/);
  assert.match(out, /ターン終了/);
  assert.match(out, /中央プール/);
  assert.match(out, /data-act="inspect"/);
  assert.match(out, /HP/);
});

test('生命・山札・手元結晶・墓地は固定のラフ値ではなく対戦状態に追従する', () => {
  const { run, html } = boot();
  run('S.p.life=3; S.p.stock=8; S.p.hot=2; S.p.cool=1; S.p.grave=6; render()');
  const out = html();
  assert.match(out, /残りライフ3/);
  assert.match(out, /手元の結晶8個、熱い2個、冷めた1個/);
  assert.match(out, />6<\/strong>/);
  assert.doesNotMatch(out, /HP[^]*?20<\/strong>/);
});

test('カード選択で詳細シートを表示し、閉じると操作を戻せる', async () => {
  const { run, html, tap } = boot();
  await tap('hand', { i: '0' });
  assert.equal(run('S.sel.kind'), 'hand');
  assert.match(html(), /class="detail open"/);
  assert.match(html(), /data-act="play"/);
  await tap('dismissDetail');
  assert.equal(run('S.sel'), null);
  assert.doesNotMatch(html(), /class="detail open"/);
});

test('設定メニューからカードの効果確認ができる', async () => {
  const { run, html, tap } = boot();
  await tap('menu');
  assert.equal(run('S.modal'), 'menu');
  assert.match(html('modal-root'), /カード一覧・効果確認/);
  await tap('catalog');
  assert.equal(run('S.modal'), 'catalog');
  assert.match(html('modal-root'), /カード一覧/);
  await tap('closeModal');
  assert.equal(run('S.modal'), null);
});

test('バトルフェイズへの移動操作を維持する', async () => {
  const { run, tap } = boot();
  run('S.gameTurn=3');
  await tap('toAttack');
  assert.equal(run('S.phase'), 'attack');
});

test('マジック使用とユニット退場で墓地カウンタを更新する', () => {
  const { run } = boot();
  run("S.p.hand=['reikyaku']; S.p.stock=5; playCard('p',0);");
  assert.equal(run('S.p.grave'), 1);
  run("S.p.units=[{uid:789,id:'risu',cr:1,tired:false,attacked:false}]; destroy('p',S.p.units[0]);");
  assert.equal(run('S.p.grave'), 2);
  assert.equal(run('S.p.units.length'), 0);
});

test('iPhoneの縦・左右横向きをInfo.plistへ冪等に指定できる', () => {
  const { withOrientations, ORIENTATIONS } = require('../scripts/ensure-ios-orientations.cjs');
  const source = '<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleName</key><string>App</string></dict></plist>';
  const patched = withOrientations(source);
  for (const orientation of ORIENTATIONS) assert.match(patched, new RegExp(orientation));
  assert.equal(withOrientations(patched), patched);
  assert.equal((patched.match(/<key>UISupportedInterfaceOrientations<\/key>/g) || []).length, 1);
});
