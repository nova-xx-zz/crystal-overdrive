'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../web/index.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'Web版にゲームスクリプトがあること');

function game() {
  const nodes = new Map();
  const handlers = {};
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, { innerHTML: '' });
      return nodes.get(id);
    },
    addEventListener(event, handler) {
      handlers[event] = handler;
    }
  };
  const context = vm.createContext({
    document,
    setTimeout(callback) { callback(); return 0; }
  });
  vm.runInContext(match[1], context, { filename: 'web/index.html' });
  return {
    run(source) { return vm.runInContext(source, context); },
    html(id) { return nodes.get(id)?.innerHTML || ''; },
    click(act, attrs = {}) {
      return handlers.click({
        target: {
          closest(selector) {
            return selector === '[data-act]' ? { dataset: { act, ...attrs } } : null;
          }
        }
      });
    }
  };
}

test('対戦開始時のライフ・結晶・デッキがルールどおり', async () => {
  const g = game();
  assert.equal(g.run('S.p.life'), 5);
  assert.equal(g.run('S.c.life'), 5);
  assert.equal(g.run('S.p.stock'), 4); // 初期3＋ターン開始1
  assert.equal(g.run('S.p.hand.length'), 4);
  assert.equal(g.run('S.p.deck.length'), 16);
  assert.equal(g.run('S.gameTurn'), 1);
  await g.click('toAttack');
  assert.equal(g.run('S.phase'), 'main', '先攻1ターン目は攻撃不可');
});

test('召喚ではコストに加えて結晶1個が必要', () => {
  const g = game();
  g.run("S.p.hand.push('risu'); S.p.stock=1;");
  assert.equal(g.run("canPlay('p', S.p.hand.length - 1)"), false);
  assert.equal(g.run("playCard('p', S.p.hand.length - 1)"), false);
  g.run('S.p.stock=2;');
  assert.equal(g.run("canPlay('p', S.p.hand.length - 1)"), true);
  assert.equal(g.run("playCard('p', S.p.hand.length - 1)"), true);
  assert.equal(g.run('S.p.stock'), 0);
  assert.equal(g.run('S.p.hot'), 1);
  assert.equal(g.run('S.p.units.length'), 1);
  assert.equal(g.run('S.p.units[0].cr'), 1);
});

test('結晶は「熱い→冷めた→手元」の2段階で戻る', () => {
  const g = game();
  g.run('S.p.stock=0; S.p.hot=2; S.p.cool=1;');
  g.run("startTurn('p')");
  assert.equal(g.run('S.p.stock'), 2, '冷めた1個＋ターン補給1個');
  assert.equal(g.run('S.p.cool'), 2, '熱い2個が冷めた状態に');
  assert.equal(g.run('S.p.hot'), 0);
  g.run("startTurn('p')");
  assert.equal(g.run('S.p.stock'), 5, '冷めた2個＋ターン補給1個が加算');
  assert.equal(g.run('S.p.cool'), 0);
});

test('対象がない／不正な対象のマジックは使用できず結晶も消費しない', () => {
  const g = game();
  g.run("S.p.hand.push('kudaki'); S.p.stock=10;");
  const handBefore = g.run('S.p.hand.length');
  assert.equal(g.run("canPlay('p', S.p.hand.length - 1)"), false);
  assert.equal(g.run("playCard('p', S.p.hand.length - 1, 999)"), false);
  assert.equal(g.run('S.p.stock'), 10);
  assert.equal(g.run('S.p.hand.length'), handBefore);
  g.run("S.c.units.push({uid:99,id:'risu',cr:2,tired:false,attacked:false});");
  assert.equal(g.run("canPlay('p', S.p.hand.length - 1)"), true);
  assert.equal(g.run("playCard('p', S.p.hand.length - 1, 999)"), false);
  assert.equal(g.run('S.p.stock'), 10, '対象UIDが違う場合も消費しない');
  assert.equal(g.run("playCard('p', S.p.hand.length - 1, 99)"), true);
  assert.equal(g.run('S.p.stock'), 7);
  assert.equal(g.run('S.p.hot'), 3);
  assert.equal(g.run('S.pool'), 2);
  assert.equal(g.run('S.c.units.length'), 0);
});

test('対象指定マジックは対象がいないと使用ボタンを無効化する', () => {
  const g = game();
  g.run("S.p.hand.push('kiri'); S.sel={kind:'hand',i:S.p.hand.length-1};");
  const detail = g.run('detailHTML()');
  assert.match(detail, /data-act="play" disabled/);
  assert.match(detail, /対象となる相手ユニットがいません/);
});

test('OD後のターン終了で反動が発生し、結晶0個のユニットは退場する', async () => {
  const g = game();
  g.run("S.active='c'; S.c.units.push({uid:100,id:'risu',cr:3,tired:false,attacked:false});");
  await g.run('endTurn()');
  assert.equal(g.run('S.c.hot'), 3, '上限超過1個＋反動2個');
  assert.equal(g.run('S.c.units.length'), 0);
  assert.equal(g.run('S.active'), 'p');
});

test('カード一覧には全12種が掲載され、閉じられる', async () => {
  const g = game();
  await g.click('catalog');
  assert.equal(g.run('S.modal'), 'catalog');
  const content = g.html('modal-root');
  assert.equal((content.match(/class="catalog-card /g) || []).length, 12);
  assert.match(content, /火花リス/);
  assert.match(content, /補給線/);
  await g.click('closeModal');
  assert.equal(g.run('S.modal'), null);
});

test('再戦すると初期状態に戻る', async () => {
  const g = game();
  g.run("S.p.life=1; endGame('c');");
  await g.click('restart');
  assert.equal(g.run('S.p.life'), 5);
  assert.equal(g.run('S.over'), null);
  assert.equal(g.run('S.gameTurn'), 1);
});
