'use strict';

const {BASELINE, runReport} = require('./balance-core.cjs');

const SCENARIOS = Object.freeze([
  {id: 'baseline', label: '現行', overrides: {}},
  {id: 'life6', label: 'ライフ6', overrides: {life: 6}},
  {id: 'life7', label: 'ライフ7', overrides: {life: 7}},
  {id: 'stock2', label: '初期結晶2', overrides: {stock: 2}},
  {id: 'stock4', label: '初期結晶4', overrides: {stock: 4}},
  {id: 'recoil1', label: 'OD反動+1', overrides: {recoil: 1}},
  {id: 'recoil3', label: 'OD反動+3', overrides: {recoil: 3}},
]);

async function compareScenarios({games=100, seed=20261031, policies=['rush','reserve']}={}) {
  // 常に同じシードとプレイヤーボット方針で比較する。実対人勝率の推定ではない。
  const rows = [];
  for (const scenario of SCENARIOS) {
    const values = {...BASELINE, ...scenario.overrides};
    const report = await runReport({games, seed, policies, scenario: values});
    rows.push({id:scenario.id, label:scenario.label, values, policies:report.policies});
  }
  const reference = rows[0];
  for (const row of rows) {
    row.delta = {};
    for (const policy of policies) {
      const current = row.policies[policy];
      const baseline = reference.policies[policy];
      row.delta[policy] = {
        winRatePoints: +(current.simulatedPlayerWinRate - baseline.simulatedPlayerWinRate).toFixed(1),
        averageTurns: +(current.averageTurns - baseline.averageTurns).toFixed(2),
      };
    }
  }
  return {gamesPerPolicy:games, seed, policies, rows};
}

module.exports = {SCENARIOS, compareScenarios};
