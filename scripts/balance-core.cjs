'use strict';

// 既存のブラウザゲームをNode.js VM上で動かす簡易対戦シミュレーター。
// プレイヤーは固定戦略のボットであり、実ユーザーの勝率を推定するものではない。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const WEB = path.join(__dirname, '..', 'web');
const FILES = ['cards.js', 'game.js', 'ui.js'];
const SOURCES = FILES.map(file => ({file, source: fs.readFileSync(path.join(WEB, file), 'utf8')}));
const MAX_TURNS = 50;

function makeRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

async function runMatch(seed, policy = 'rush') {
  if (!['rush', 'reserve'].includes(policy)) throw new Error('不明な方針: ' + policy);
  const rng = Object.create(Math);
  rng.random = makeRandom(seed);
  const elements = new Map();
  const document = {
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, {innerHTML: ''});
      return elements.get(id);
    },
  };
  const ctx = vm.createContext({document, Math: rng, setTimeout: fn => { fn(); return 0; }});
  for (const {file, source} of SOURCES) vm.runInContext(source, ctx, {filename: file});

  // 非同期のCPU攻撃でモーダル待ちにしない。自動プレイヤーも勝てるブロックを優先する。
  vm.runInContext(`askBlock = function(att) {
    const ready = S.p.units.filter(u => !u.tired);
    const win = ready.filter(u => power(u) >= power(att))
      .sort((a,b) => power(a)-power(b) || card(a.id).cost-card(b.id).cost)[0];
    const dmg = isOD(att) && card(att.id).odFx === 'pierce' ? 2 : 1;
    const emergency = S.p.life <= dmg
      ? ready.slice().sort((a,b) => card(a.id).cost-card(b.id).cost)[0] : null;
    return Promise.resolve(win || emergency || null);
  };`, ctx);

  const run = (code) => vm.runInContext(code, ctx);
  while (!run('S.over') && run('S.gameTurn') <= MAX_TURNS) {
    if (run("S.active !== 'p'")) throw new Error('プレイヤーターン以外に復帰した');
    // 召喚は場の上限と結晶を守る。rushは安価なカード優先、reserveはLv2用の結晶を確保。
    for (let tries = 0; tries < 8 && !run('S.over'); tries++) {
      const picks = run(`S.p.hand.map((id,i) => ({id,i,cost:card(id).cost,type:card(id).type}))
        .filter(x => x.type === 'unit' && canPlay('p',x.i))`);
      picks.sort((a,b) => a.cost-b.cost || a.i-b.i);
      const pick = picks.find(x => policy === 'rush' || run('S.p.stock') >= x.cost + 3);
      if (!pick) break;
      run(`playCard('p',${pick.i})`);
    }
    // マジックは効果が見込める場合のみ使用する。
    for (let tries = 0; tries < 5 && !run('S.over'); tries++) {
      const playable = run(`S.p.hand.map((id,i) => ({id,i,fx:card(id).fx,type:card(id).type}))
        .filter(x => x.type === 'spell' && canPlay('p',x.i))`);
      let chosen = null, uid = null;
      for (const spell of playable) {
        const state = run('S');
        if (spell.fx === 'coolAll' && state.p.hot >= 2) { chosen = spell; break; }
        if (spell.fx === 'draw2' && state.p.hand.length <= 2 && state.p.deck.length >= 2) { chosen = spell; break; }
        if (spell.fx === 'shatter' && state.c.units.length) {
          const t = state.c.units.slice().sort((a,b)=>b.cr-a.cr)[0];
          if (t.cr >= 2) { chosen = spell; uid = t.uid; break; }
        }
        if (spell.fx === 'freeze' && state.c.units.some(u=>!u.tired)) {
          const t = state.c.units.filter(u=>!u.tired)
            .sort((a,b)=>run(`power({id:'${b.id}',cr:${b.cr}})`)-run(`power({id:'${a.id}',cr:${a.cr}})`))[0];
          chosen = spell; uid = t.uid; break;
        }
      }
      if (!chosen) break;
      run(`playCard('p',${chosen.i}${uid===null?'':','+uid})`);
    }
    // 盤面を強化。無理にODは使わず、Lv2まで。
    const units = run('S.p.units.slice()');
    for (const u of units) {
      const need = run(`card('${u.id}').lv2`) - u.cr;
      const reserve = policy === 'reserve' ? 1 : 0;
      if (need > 0 && run('S.p.stock') >= need + reserve) {
        run(`S.p.stock -= ${need}; S.p.units.find(u=>u.uid===${u.uid}).cr += ${need};`);
      }
    }
    if (run('S.gameTurn') > 1) {
      const attackers = run('S.p.units.slice()');
      for (const u of attackers) {
        if (run('S.over')) break;
        if (!run(`S.p.units.some(x=>x.uid===${u.uid} && !x.tired && !x.attacked)`)) continue;
        const myPower = run(`power(S.p.units.find(x=>x.uid===${u.uid}))`);
        const blockers = run('S.c.units.filter(u=>!u.tired)');
        const maxPower = blockers.length ? Math.max(...blockers.map(x=>run(`power({id:'${x.id}',cr:${x.cr}})`))) : -1;
        if (policy === 'reserve' && myPower < maxPower) continue;
        await run(`attack('p', S.p.units.find(u=>u.uid===${u.uid}))`);
      }
    }
    if (!run('S.over')) await run('endTurn()');
  }
  const final = run('S');
  return {
    winner: final.over || 'timeout',
    turns: Math.ceil(final.gameTurn / 2),
    life: {player: final.p.life, cpu: final.c.life},
    cardsLeft: {player: final.p.deck.length, cpu: final.c.deck.length},
  };
}

async function runReport({games = 100, seed = 20261031, policies = ['rush','reserve']} = {}) {
  if (!Number.isInteger(games) || games < 1 || games > 5000) throw new Error('games は1〜5000にしてください');
  if (!Number.isInteger(seed)) throw new Error('seed は整数にしてください');
  const report = {seed, gamesPerPolicy: games, policies: {}};
  for (const policy of policies) {
    const counts = {player: 0, cpu: 0, timeout: 0};
    let turnsSum = 0;
    let minTurns = Infinity, maxTurns = -Infinity;
    for (let i = 0; i < games; i++) {
      const result = await runMatch(seed + i, policy);
      counts[result.winner]++;
      turnsSum += result.turns;
      minTurns = Math.min(minTurns, result.turns);
      maxTurns = Math.max(maxTurns, result.turns);
    }
    report.policies[policy] = {
      counts,
      simulatedPlayerWinRate: +(counts.player / games * 100).toFixed(1),
      averageTurns: +(turnsSum / games).toFixed(2),
      minTurns,
      maxTurns,
    };
  }
  return report;
}

module.exports = {runMatch, runReport};
