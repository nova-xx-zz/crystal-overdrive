'use strict';

const {runReport} = require('./balance-core.cjs');

function option(name, fallback) {
  const pos = process.argv.indexOf(name);
  if (pos < 0) return fallback;
  if (pos + 1 >= process.argv.length) throw new Error(name + ' の数値がありません');
  const n = Number(process.argv[pos + 1]);
  if (!Number.isInteger(n)) throw new Error(name + ' は整数で指定してください');
  return n;
}

async function main() {
  const games = option('--games', 100);
  const seed = option('--seed', 20261031);
  const result = await runReport({games, seed});
  console.log('結晶オーバードライブ：簡易バランスレポート');
  console.log('固定戦略プレイヤーボット対CPU。人間の勝率を示すものではありません。');
  console.log(`seed=${seed}、方針ごとに${games}試合\n`);
  for (const [policy, data] of Object.entries(result.policies)) {
    console.log(`[${policy}] ボット勝率 ${data.simulatedPlayerWinRate}% / 平均決着 ${data.averageTurns}ターン (最短${data.minTurns} / 最長${data.maxTurns})`);
    console.log(`  プレイヤー勝ち ${data.counts.player}、CPU勝ち ${data.counts.cpu}、未決着 ${data.counts.timeout}`);
  }
  console.log('\n機能調整前後は必ず同じseed・試合数・方針で比較してください。');
}

main().catch(err => {console.error(err);process.exitCode = 1;});
