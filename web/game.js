"use strict";

/* ===== 状態 ===== */
let S, uidN = 1, GID = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = g => S.gid===g && !S.over;
const other = s => s === 'p' ? 'c' : 'p';
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function newSide(name){ return {name, life:START_LIFE, stock:START_STOCK, hot:0, cool:0, deck:shuffle(DECK_LIST.slice()), hand:[], units:[]}; }

function newGame(){
  GID++;
  S = {gid:GID, gameTurn:1, active:'p', phase:'main', pool:0, p:newSide('あなた'), c:newSide('CPU'),
       sel:null, targeting:null, log:[], busy:false, over:null, hint:'', flash:null, blockResolve:null, modal:null};
  for(let i=0;i<START_HAND;i++){ drawCard('p'); drawCard('c'); }
  log('対戦開始！あなたの先攻です');
  startTurn('p');
  render();
}
function log(t){ S.log.push(t); if(S.log.length>60) S.log.shift(); }

/* ===== 基本処理 ===== */
const card = id => CARDS[id];
const isOD = u => u.cr > card(u.id).cap;
function power(u){ const d=card(u.id); let p = u.cr>=d.lv2 ? d.pow[1] : d.pow[0]; if(isOD(u)) p += d.od; return p; }
function lvLabel(u){ const d=card(u.id); return isOD(u) ? 'オーバードライブ' : (u.cr>=d.lv2 ? 'Lv2' : 'Lv1'); }

function drawCard(s){
  const P=S[s];
  if(!P.deck.length){ log(`${P.name}の山札が尽きた`); endGame(other(s)); return false; }
  P.hand.push(P.deck.pop()); return true;
}
function startTurn(s){
  const P=S[s], O=S[other(s)];
  S.active=s; S.phase='main'; S.sel=null; S.targeting=null; S.hint='';
  P.units.forEach(u=>{ u.tired=false; u.attacked=false; });
  P.stock += P.cool; P.cool = P.hot; P.hot = 0;   // 冷めた→手元、熱い→冷めた
  P.stock += 1;
  if(P.life < O.life && S.pool > 0){ S.pool--; P.stock++; log(`${P.name}：ライフが少ないので中央プールから結晶1個を獲得`); }
  if(S.gameTurn > 1) drawCard(s);
}
function canPlay(s,i){
  const P=S[s], d=card(P.hand[i]);
  if(!d) return false;
  if(d.type==='unit') return P.stock >= d.cost+1 && P.units.length < MAX_UNITS;
  return P.stock >= d.cost && (!d.target || S[other(s)].units.length > 0);
}
function playCard(s,i,targetUid){
  const P=S[s], id=P.hand[i], d=card(id);
  if(!d || !canPlay(s,i)) return false;
  if(d.target && !S[other(s)].units.some(u=>u.uid===targetUid)) return false;
  P.hand.splice(i,1);
  P.stock -= d.cost; P.hot += d.cost;
  if(d.type==='unit'){
    P.stock -= 1;
    const u={uid:uidN++, id, cr:1, tired:false, attacked:false};
    P.units.push(u);
    log(`${P.name}：${d.name}を召喚`);
    if(d.onSummon==='draw'){ if(drawCard(s)) log(`${d.name}の効果：1枚引いた`); }
    if(d.onSummon==='gain' && S.pool>0){ S.pool--; P.stock++; log(`${d.name}の効果：中央プールから結晶1個を獲得`); }
  } else {
    log(`${P.name}：${d.name}を使った`);
    const os=other(s), O=S[os];
    if(d.fx==='coolAll'){ P.cool += P.hot; P.hot = 0; }
    if(d.fx==='draw2'){ drawCard(s) && drawCard(s); }
    if(d.fx==='shatter'){ const u=O.units.find(x=>x.uid===targetUid); if(u) removeToPool(os,u,2); }
    if(d.fx==='freeze'){ const u=O.units.find(x=>x.uid===targetUid); if(u){ u.tired=true; log(`${card(u.id).name}は疲労した`); } }
  }
  return true;
}
function removeToPool(s,u,n){
  const k=Math.min(n,u.cr); u.cr-=k; S.pool+=k;
  log(`${card(u.id).name}の結晶${k}個が中央プールへ`);
  if(u.cr<=0) destroy(s,u);
}
function destroy(s,u){
  const P=S[s];
  P.units = P.units.filter(x=>x!==u);
  P.cool += u.cr;
  log(`${card(u.id).name}は退場した`);
  if(S.sel && S.sel.kind==='unit' && S.sel.uid===u.uid) S.sel=null;
}
function maxCrUnit(units){ return units.slice().sort((a,b)=>b.cr-a.cr)[0] || null; }

async function attack(s,u){
  const P=S[s], os=other(s), O=S[os], d=card(u.id), od=isOD(u), g=S.gid;
  u.tired=true; u.attacked=true;
  log(`${P.name}：${d.name}（パワー${power(u)}）で攻撃${od?'【オーバードライブ】':''}`);
  S.flash=u.uid; render(); await sleep(450); if(S.gid!==g) return; S.flash=null;
  if(od){
    if(d.odFx==='burn'){ const t=maxCrUnit(O.units); if(t) removeToPool(os,t,1); }
    if(d.odFx==='burnAll'){ O.units.slice().forEach(t=>removeToPool(os,t,1)); }
    if(d.odFx==='cool' && P.hot>0){ P.hot--; P.stock++; log(`${d.name}の効果：熱い結晶1個を手元へ`); }
  }
  render();
  const blocker = s==='p' ? cpuChooseBlock(u) : await askBlock(u);
  if(!alive(g)) return;
  if(blocker && O.units.includes(blocker)){
    blocker.tired=true;
    const ap=power(u), bp=power(blocker);
    log(`${O.name}：${card(blocker.id).name}（パワー${bp}）でブロック`);
    if(ap>=bp) destroy(os,blocker);
    if(bp>=ap) destroy(s,u);
  } else {
    const dmg = (od && d.odFx==='pierce') ? 2 : 1;
    const k=Math.min(dmg,O.life); O.life-=k; S.pool+=k;
    log(`${O.name}のライフ −${k}（残り${O.life}）。削れた結晶は中央プールへ`);
    if(O.life<=0) endGame(s);
  }
  if(od && d.odFx==='stand' && P.units.includes(u)){ u.tired=false; log(`${d.name}は回復した`); }
  render();
}

async function endTurn(){
  if(S.over) return;
  const s=S.active, P=S[s];
  P.units.slice().forEach(u=>{
    const d=card(u.id), ex=u.cr-d.cap;
    if(ex>0){
      const k=Math.min(u.cr, ex+OD_RECOIL);
      u.cr-=k; P.hot+=k;
      log(`${d.name}の過負荷：結晶${k}個が熱い状態へ`);
      if(u.cr<=0) destroy(s,u);
    }
  });
  S.gameTurn++;
  const n=other(s);
  log(`―― ${S[n].name}のターン ――`);
  startTurn(n);
  if(n==='p') S.busy=false;
  render();
  if(S.over) return;
  if(n==='c') await cpuTurn();
}
function endGame(winner){
  if(S.over) return;
  S.over=winner; S.busy=false; S.modal='over';
  if(S.blockResolve){ const r=S.blockResolve; S.blockResolve=null; r(null); }
}

/* ===== CPU ===== */
function cpuChooseBlock(att){
  const C=S.c, ap=power(att), d=card(att.id);
  const dmg=(isOD(att)&&d.odFx==='pierce')?2:1;
  // 勝てるなら必要以上に強いユニットを使わず、最も安い戦力で受ける。
  const cands=C.units.filter(u=>!u.tired)
    .sort((a,b)=>card(a.id).cost-card(b.id).cost || power(a)-power(b) || a.uid-b.uid);
  if(!cands.length) return null;
  const wins=cands.filter(u=>power(u)>ap).sort((a,b)=>power(a)-power(b) || card(a.id).cost-card(b.id).cost);
  if(wins.length) return wins[0];
  const ties=cands.filter(u=>power(u)===ap && (card(u.id).cost<=d.cost || C.life<=dmg));
  if(ties.length) return ties[0];
  // 致死ダメージは最も安いユニットを犠牲にして必ず防ぐ。
  if(C.life<=dmg || C.life<=2) return cands[0];
  return null;
}

// 投入できないユニットを候補から除外し、ODの効果・反動を点数化する。
// 計算結果を返すだけで結晶を消費しないため、CPUテストで独立して検証できる。
function cpuOverdriveChoice(stock, enemyLife, enemyUnits, roll){
  if(enemyLife>2 && roll>=0.35) return null;
  const candidates=S.c.units.filter(u=>!u.tired && !u.attacked && !isOD(u)).map(u=>{
    const d=card(u.id), need=Math.max(0,d.cap+1-u.cr);
    if(need>stock) return null;
    const lethal=!enemyUnits.some(x=>!x.tired) && enemyLife<=(d.odFx==='pierce'?2:1);
    const effect=d.odFx==='burnAll' ? enemyUnits.length*4
      : (d.odFx==='burn' && enemyUnits.length ? 4 : 0);
    const score=(lethal?100:0)+d.od*2+effect-need-(d.cap<=2 && !lethal?3:0);
    return {u,need,score};
  }).filter(Boolean);
  candidates.sort((a,b)=>b.score-a.score || a.need-b.need || a.u.uid-b.u.uid);
  return candidates[0] || null;
}
function cpuSpellTarget(id){
  const C=S.c, P=S.p, d=card(id);
  if(C.stock<d.cost) return false;
  if(d.fx==='coolAll') return C.hot>=3 ? {} : false;
  if(d.fx==='draw2') return C.hand.length<=3 ? {} : false;
  if(d.fx==='shatter'){ const t=maxCrUnit(P.units); return (t && t.cr>=2) ? {uid:t.uid} : false; }
  if(d.fx==='freeze'){ const t=P.units.filter(u=>!u.tired).sort((a,b)=>power(b)-power(a))[0]; return (t && power(t)>=3) ? {uid:t.uid} : false; }
  return false;
}
async function cpuTurn(){
  // 再戦でSが置き換わっても、古いCPU処理が新しい対戦に干渉しないよう先に世代を保持する。
  const g=S.gid;
  S.busy=true; render(); await sleep(700);
  if(!alive(g)) return;
  const C=S.c, P=S.p;
  // 召喚（重いものから）
  for(;;){
    if(!alive(g)) return;
    const idx=C.hand.map((id,i)=>i).filter(i=>card(C.hand[i]).type==='unit' && canPlay('c',i))
      .sort((a,b)=>card(C.hand[b]).cost-card(C.hand[a]).cost);
    if(!idx.length) break;
    playCard('c',idx[0]); render(); await sleep(650);
  }
  // マジック
  for(let i=C.hand.length-1;i>=0;i--){
    if(!alive(g)) return;
    const id=C.hand[i]; if(card(id).type!=='spell') continue;
    const t=cpuSpellTarget(id);
    if(t){ playCard('c',i,t.uid); render(); await sleep(650); }
  }
  if(!alive(g)) return;
  // Lv2まで結晶を乗せる
  C.units.slice().sort((a,b)=>(card(a.id).lv2-a.cr)-(card(b.id).lv2-b.cr)).forEach(u=>{
    const need=card(u.id).lv2-u.cr;
    if(need>0 && C.stock>=need){ C.stock-=need; u.cr+=need; }
  });
  // 手元の結晶で実行可能なODから、有効な攻撃効果を優先して選ぶ。
  const od=cpuOverdriveChoice(C.stock,P.life,P.units,Math.random());
  if(od && od.need>0){
    C.stock-=od.need; od.u.cr+=od.need;
    log(`CPU：${card(od.u.id).name}をオーバードライブ`);
  }
  render(); await sleep(600); if(!alive(g)) return;
  // 攻撃
  S.phase='attack'; render(); await sleep(400);
  while(alive(g)){
    const ready=C.units.filter(u=>!u.tired && !u.attacked).sort((a,b)=>power(b)-power(a));
    if(!ready.length) break;
    const blockers=P.units.filter(u=>!u.tired);
    const maxB=blockers.length ? Math.max(...blockers.map(power)) : -1;
    let pick=ready.find(u=>isOD(u) || power(u)>maxB);
    if(!pick && P.life<=ready.length) pick=ready[0];
    if(pick && !isOD(pick) && C.life<=2 && P.units.length>0 && ready.length===1 && P.life>1) pick=null;
    if(!pick) break;
    await attack('c',pick);
    await sleep(450);
  }
  if(!alive(g)){ if(S.gid===g) render(); return; }
  await endTurn();
}

/* ===== プレイヤーのブロック選択 ===== */
function askBlock(att){
  const cands=S.p.units.filter(u=>!u.tired);
  if(!cands.length) return Promise.resolve(null);
  return new Promise(res=>{ S.blockResolve=res; S.modal={kind:'block', att}; render(); });
}
