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
