'use strict';

const {compareScenarios} = require('./balance-scenario-core.cjs');

function integerArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  if (index === process.argv.length-1) throw new Error(flag + ' に整数がありません');
  const value = Number(process.argv[index+1]);
  if (!Number.isInteger(value)) throw new Error(flag + ' は整数で指定してください');
  return value;
}

async function main() {
  const games = integerArg('--games', 100);
  const seed = integerArg('--seed', 20261031);
  const report = await compareScenarios({games, seed});
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log('結晶オーバードライブ：調整シナリオ比較');
  console.log(`固定シード ${seed} / 各方針・各シナリオ ${games} 試合 / 本番のカード数値は変更なし`);
  console.log('これは固定戦略ボット対CPUの結果であり、実プレイヤーの勝率ではありません。');
  for (const row of report.rows) {
    console.log(`\n[${row.id}] ${row.label} (life=${row.values.life},stock=${row.values.stock},recoil=${row.values.recoil})`);
    for (const policy of report.policies) {
      const result = row.policies[policy], delta = row.delta[policy];
      const signed = x => x >= 0 ? '+'+x : String(x);
      console.log(`  ${policy}: ボット勝率${result.simulatedPlayerWinRate}% (基準差${signed(delta.winRatePoints)}pt) / 平均${result.averageTurns}ターン (基準差${signed(delta.averageTurns)}) / 未決着${result.counts.timeout}`);
    }
  }
  console.log('\n比較の差はサンプル数やボット方針に依存します。これだけで本番パラメータは確定しません。');
}

main().catch(error => {console.error(error); process.exitCode = 1;});
