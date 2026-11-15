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

test('俯瞰型フィールドは盤面・疑似奥行き・双方の情報・手札を表示する', () => {
  const out = boot().html();
  for (const selector of ['arena-mode', 'arena-table', 'arena-compass', 'arena-piles-enemy', 'arena-piles-player', 'opponent-hand',
    'opponent-lane', 'player-lane', 'hand-box', 'battle-footer']) {
    assert.ok(out.includes(selector), selector);
  }
  assert.match(out, /対戦終了|あなたのターン|相手のターン/);
  assert.match(out, /data-act="toAttack"/);
  assert.match(out, /data-act="end"/);
});

test('3D風の意匠は外部画像を使わず縦横で配置し、手札操作を残す', () => {
  const html = read('web/index.html');
  const css = read('web/arena-battle.css');
  assert.match(html, /<link rel="stylesheet" href=".\/arena-battle.css">/);
  assert.ok(html.indexOf('arena-battle.css') > html.indexOf('ios-battle.css'), '上書きスタイルが最後');
  assert.match(css, /perspective\(/);
  assert.match(css, /@media\(orientation:portrait\)/);
  assert.match(css, /@media\(orientation:landscape\)/);
  assert.match(css, /\.arena-mode \.hand\{[^}]*overflow-x:auto/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.doesNotMatch(css, /https?:\/\//, 'オフラインの同梱CSS');
});

test('HP・相手手札・パワー・搭載結晶は固定イメージでなく実際の対戦値', () => {
  const { run, html } = boot();
  run("S.c.hand=['risu','pen']; S.p.life=2; S.p.units=[{uid:741,id:'totsu',cr:2,tired:false,attacked:false}]; render()");
  const out = html();
  assert.match(out, /相手の手札2枚/);
  assert.equal((out.match(/class="opponent-card-back"/g) || []).length, 2);
  assert.match(out, /残りライフ2/);
  assert.match(out, /パワー4/);
  assert.match(out, /⚔<\/span>4/);
  assert.match(out, /◆<\/span>2/);
  assert.doesNotMatch(out, /HP\s*20/);
});

test('メイン操作を引き継ぎ、手札の扇形は枚数によって動的に変化する', async () => {
  const { run, html, tap } = boot();
  assert.match(html(), /--fan-angle:/);
  await tap('hand', { i: '0' });
  assert.equal(run('S.sel.kind'), 'hand');
  assert.match(html(), /class="detail open"/);
  await tap('dismissDetail');
  assert.equal(run('S.sel'), null);
  await tap('menu');
  assert.match(run('S.modal'), /menu/);
});

test('ネイティブWebViewの必須UIはネットワークフォントへの依存がない', () => {
  const html = read('web/index.html');
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(html, /viewport-fit=cover/);
});

test('画面内に装飾だけのカード枠を重複表示せず、各陣営4スロットとする', () => {
  const { run, html } = boot();
  run("S.p.units=[]; S.c.units=[]; render()");
  const out = html();
  assert.doesNotMatch(out, /arena-echo-row/);
  assert.equal((out.match(/class="slot"/g) || []).length, 8);
  assert.match(out, /opponent-lane/);
  assert.match(out, /player-lane/);
});

test('縦横の三区画レイアウトとSafe Areaを保証し、重複する旧位置指定に依存しない', () => {
  const css = read('web/arena-battle.css');
  assert.match(css, /grid-template-rows:72px minmax\(0,1fr\) minmax\(245px,33%\)/);
  assert.match(css, /\.arena-mode \.arena-opponent\{\s*grid-column:1;grid-row:1/);
  assert.match(css, /\.arena-mode \.arena-table\{\s*grid-column:1;grid-row:2/);
  assert.match(css, /\.arena-mode \.arena-player\{\s*grid-column:1;grid-row:3/);
  assert.match(css, /grid-template-rows:45px minmax\(0,1fr\) minmax\(103px,27%\)/);
  assert.match(css, /grid-template-columns:minmax\(154px,24%\) minmax\(0,1fr\) 103px/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-right/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /safe-area-inset-left/);
  assert.match(css, /overflow-x:auto;overflow-y:hidden/);
  assert.match(css, /\.arena-mode \.field .landscape-extra\{display:none!important\}/);
});
