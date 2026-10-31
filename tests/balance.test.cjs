'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {runMatch,runReport} = require('../scripts/balance-core.cjs');

test('同じシード・方針の自動対戦は同じ結果になる', async () => {
  const a = await runMatch(1122, 'rush');
  const b = await runMatch(1122, 'rush');
  assert.deepEqual(a,b);
  assert.ok(['p','c','timeout'].includes(a.winner));
  assert.ok(a.turns > 0 && a.turns <= 26);
});

test('複数試合のレポートは勝敗合計と試合数が一致する', async () => {
  const report = await runReport({games:4,seed:123,policies:['rush','reserve']});
  for (const p of ['rush','reserve']) {
    const r=report.policies[p];
    assert.equal(r.counts.player+r.counts.cpu+r.counts.timeout,4);
    assert.ok(r.simulatedPlayerWinRate>=0 && r.simulatedPlayerWinRate<=100);
    assert.ok(r.averageTurns>0);
  }
});

test('未定義の方針や過大な試行数を拒否する', async () => {
  await assert.rejects(runMatch(1,'unknown'),/不明な方針/);
  await assert.rejects(runReport({games:5001}),/games/);
});

const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const {BASELINE, normalizeScenario, cardsForScenario} = require('../scripts/balance-core.cjs');
const {SCENARIOS, compareScenarios} = require('../scripts/balance-scenario-core.cjs');

test('シナリオの値は正規化され、未対応の項目や範囲外を拒否する', () => {
  assert.deepEqual(normalizeScenario({life:7}), {life:7, stock:3, recoil:2});
  assert.deepEqual(BASELINE, {life:5, stock:3, recoil:2});
  assert.throws(()=>normalizeScenario({life:0}), /life/);
  assert.throws(()=>normalizeScenario({stock:9}), /stock/);
  assert.throws(()=>normalizeScenario({recoil:-1}), /recoil/);
  assert.throws(()=>normalizeScenario({other:10}), /未対応/);
  assert.throws(()=>normalizeScenario(null), /オブジェクト/);
});

test('本番のカード定義を改変せず、VMに入れる定数だけを切り替える', () => {
  const original = fs.readFileSync(path.join(__dirname, '..', 'web', 'cards.js'), 'utf8');
  const candidate = cardsForScenario({life:7, stock:2, recoil:3});
  const context = vm.createContext({});
  vm.runInContext(candidate, context);
  assert.equal(vm.runInContext('START_LIFE',context),7);
  assert.equal(vm.runInContext('START_STOCK',context),2);
  assert.equal(vm.runInContext('OD_RECOIL',context),3);
  assert.match(original, /START_LIFE = 5/);
  assert.match(original, /START_STOCK = 3/);
  assert.match(original, /OD_RECOIL = 2/);
  assert.equal(fs.readFileSync(path.join(__dirname, '..', 'web', 'cards.js'), 'utf8'),original);
});

test('デフォルト値と明示した基準シナリオは完全一致する', async () => {
  assert.deepEqual(await runMatch(20261031, 'rush'),
    await runMatch(20261031, 'rush', BASELINE));
});

test('7シナリオを同一シードで比較し基準差を返す', async () => {
  const report = await compareScenarios({games:3, seed:17, policies:['rush']});
  assert.equal(report.rows.length,7);
  assert.deepEqual(report.rows.map(row=>row.id),SCENARIOS.map(row=>row.id));
  const baseline = report.rows[0];
  assert.equal(baseline.delta.rush.winRatePoints,0);
  assert.equal(baseline.delta.rush.averageTurns,0);
  assert.equal(baseline.values.life,5);
  assert.equal(report.rows[2].values.life,7);
  assert.equal(report.rows[3].values.stock,2);
  assert.equal(report.rows[6].values.recoil,3);
  for (const row of report.rows) {
    assert.equal(Object.values(row.policies.rush.counts).reduce((a,b)=>a+b,0),3);
  }
});
