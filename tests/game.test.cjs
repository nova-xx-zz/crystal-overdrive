'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Web試作版は単一HTMLのため、ブラウザを起動せずゲームロジックを検証する。
const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/);
if (!script) throw new Error('web/index.html にゲームスクリプトがありません');

function boot() {
  const timers = [];
  const elements = new Map();
  const document = {
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { innerHTML: '' });
      return elements.get(id);
    },
  };
  const context = vm.createContext({
    document,
    setTimeout(callback) { timers.push(callback); },
  });
  vm.runInContext(script[1], context, { filename: 'web/index.html' });
  return { timers, run: (code) => vm.runInContext(code, context) };
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
