"use strict";

/* ===== 描画 ===== */
const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function gems(n,max){ let h=''; for(let i=0;i<max;i++) h+=`<span class="gem${i<n?'':' empty'}"></span>`; return h; }
function resBar(s){
  const P=S[s];
  return `<div class="res">
    <span class="who">${P.name}</span>
    <span class="lifebar" aria-label="ライフ${P.life}">${gems(P.life,START_LIFE)}</span>
    <span class="chip stock">手元<b>${P.stock}</b></span>
    <span class="chip hot">熱い<b>${P.hot}</b></span>
    <span class="chip cool">冷めた<b>${P.cool}</b></span>
    <span class="chip">山札<b>${P.deck.length}</b></span>
    ${s==='c'?`<span class="chip">手札<b>${P.hand.length}</b></span>`:''}
  </div>`;
}
function unitHTML(u,side){
  const d=card(u.id); let dots='';
  for(let i=0;i<d.cap+OD_MAX_OVER;i++) dots+=`<span class="dot${i<u.cr?' on':''}${i>=d.cap?' ov':''}"></span>`;
  const sel = S.sel && S.sel.kind==='unit' && S.sel.uid===u.uid;
  const tgt = S.targeting && side==='c';
  return `<button class="unit ${d.attr}${u.tired?' tired':''}${isOD(u)?' od':''}${sel?' sel':''}${tgt?' tgt':''}${S.flash===u.uid?' hit':''}"
    data-act="unit" data-side="${side}" data-uid="${u.uid}" aria-pressed="${!!sel}" aria-label="${esc(d.name)} パワー${power(u)}${tgt?' 対象に指定':''}">
    <span class="sig">${d.sig}</span><span class="pw">${power(u)}</span>
    <span class="lv">${isOD(u)?'OD':lvLabel(u)}</span><span class="nm">${esc(d.name)}</span>
    <span class="dots">${dots}</span>${u.tired?'<span class="tag">疲労</span>':''}</button>`;
}
function fieldHTML(s){
  const us=S[s].units; let h=us.map(u=>unitHTML(u,s)).join('');
  for(let i=us.length;i<MAX_UNITS;i++) h+='<div class="slot"></div>';
  return `<div class="field">${h}</div>`;
}
const myMain = () => S.active==='p' && S.phase==='main' && !S.busy && !S.over;
const myAttack = () => S.active==='p' && S.phase==='attack' && !S.busy && !S.over;

function unitInfo(d){
  return `<div class="stats"><span>Lv1 <b>${d.pow[0]}</b></span><span>Lv2（結晶${d.lv2}〜）<b>${d.pow[1]}</b></span><span>上限 <b>${d.cap}</b></span></div>
    <div class="fx"><em>オーバードライブ</em>（結晶${d.cap+1}〜${d.cap+OD_MAX_OVER}）：パワー+${d.od}、攻撃時 ${FX_TEXT[d.odFx]}</div>
    ${d.onSummon?`<div class="fx">${FX_TEXT[d.onSummon]}</div>`:''}`;
}
function detailHTML(){
  if(S.targeting){
    const d=card(S.p.hand[S.targeting.i]);
    return `<h2>${esc(d.name)}<small>対象を選んでください</small></h2>
      <div class="hint">相手のユニットをタップすると「${FX_TEXT[d.fx]}」が発動します。</div>
      <div class="btns"><button class="btn" data-act="cancelT">やめる</button></div>`;
  }
  const sel=S.sel;
  if(sel && sel.kind==='hand' && S.p.hand[sel.i]){
    const d=card(S.p.hand[sel.i]), ok=myMain() && canPlay('p',sel.i);
    if(d.type==='unit'){
      const why = S.p.units.length>=MAX_UNITS ? '場がいっぱいです' : (S.p.stock<d.cost+1 ? `手元の結晶が${d.cost+1}個必要です` : '');
      return `<h2>${esc(d.name)}<small>ユニット・コスト${d.cost}（召喚には結晶${d.cost+1}個）</small></h2>${unitInfo(d)}
        <div class="btns"><button class="btn primary" data-act="play" ${ok?'':'disabled'}>召喚する</button></div>
        ${!ok && myMain() && why?`<div class="hint">${why}</div>`:''}`;
    }
    const targetHint = d.target && !S.c.units.length && myMain()
      ? '<div class="hint">対象となる相手ユニットがいません。</div>' : '';
    return `<h2>${esc(d.name)}<small>マジック・コスト${d.cost}</small></h2><div class="fx">${FX_TEXT[d.fx]}</div>
      <div class="btns"><button class="btn primary" data-act="play" ${ok?'':'disabled'}>使う</button></div>${targetHint}`;
  }
  if(sel && sel.kind==='unit'){
    const P=S[sel.side], u=P.units.find(x=>x.uid===sel.uid);
    if(u){
      const d=card(u.id), mine=sel.side==='p';
      let btns='';
      if(mine && myMain()){
        btns=`<div class="btns">
          <button class="btn" data-act="minus" ${u.cr>1?'':'disabled'}>結晶を手元へ戻す</button>
          <button class="btn ${u.cr>=d.cap?'warn':'primary'}" data-act="plus" ${(S.p.stock>0 && u.cr<d.cap+OD_MAX_OVER)?'':'disabled'}>${u.cr>=d.cap?'乗せて過負荷':'結晶を乗せる'}</button></div>`;
      } else if(mine && myAttack()){
        const can=!u.tired && !u.attacked;
        btns=`<div class="btns"><button class="btn warn" data-act="atk" ${can?'':'disabled'}>${u.attacked?'このターンは攻撃済み':(u.tired?'疲労中':'このユニットで攻撃')}</button></div>`;
      }
      const odNote = isOD(u) ? `<div class="hint">ターン終了時、結晶${Math.min(u.cr,u.cr-d.cap+OD_RECOIL)}個が熱い状態になります${u.cr-d.cap+OD_RECOIL>=u.cr?'（退場します）':''}</div>` : '';
      return `<h2>${esc(d.name)}<small>${mine?'あなた':'CPU'}・結晶${u.cr}個・${lvLabel(u)}・パワー${power(u)}</small></h2>${unitInfo(d)}${odNote}${btns}`;
    }
  }
  if(S.over) return `<div class="hint">対戦が終わりました。</div>`;
  if(S.active==='c') return `<h2>CPUのターン</h2><div class="hint">CPUが行動しています。攻撃されたらブロックするか選べます。</div>`;
  if(S.phase==='main') return `<h2>メインフェイズ</h2><div class="hint">${S.hint || '手札をタップして召喚。自分のユニットをタップすると結晶を乗せ替えられます。上限を超えて乗せるとオーバードライブ。'}</div>`;
  return `<h2>攻撃フェイズ</h2><div class="hint">${S.hint || '攻撃させたいユニットをタップしてください。攻撃したユニットは相手のターン中ブロックできません。'}</div>`;
}
function handHTML(){
  return `<div class="hand">${S.p.hand.map((id,i)=>{
    const d=card(id), ok=myMain() && canPlay('p',i), sel=S.sel && S.sel.kind==='hand' && S.sel.i===i;
    return `<button class="card ${d.attr}${d.type==='spell'?' spell':''}${ok?'':' dim'}${sel?' sel':''}" data-act="hand" data-i="${i}" aria-pressed="${!!sel}" aria-label="${esc(d.name)} コスト${d.cost}">
      <span class="cost">${d.cost}</span><span class="sig">${d.sig}</span><span class="nm">${esc(d.name)}</span><span class="ty">${d.type==='unit'?'ユニット':'マジック'}</span></button>`;
  }).join('')}</div>`;
}
function modalHTML(){
  const m=S.modal; if(!m) return '';
  if(m==='catalog'){
    const items = Object.values(CARDS).map(d=>{
      const summary = d.type==='unit'
        ? `Lv1 ${d.pow[0]} / Lv2 ${d.pow[1]}（結晶${d.lv2}〜） / 上限${d.cap}`
        : FX_TEXT[d.fx];
      const effect = d.type==='unit'
        ? `OD：パワー+${d.od}・${FX_TEXT[d.odFx]}${d.onSummon?` / ${FX_TEXT[d.onSummon]}`:''}`
        : '';
      return `<div class="catalog-card ${d.attr}">
        <div class="catalog-top"><span class="catalog-symbol sig">${esc(d.sig)}</span><span class="catalog-cost">COST ${d.cost}</span></div>
        <div class="catalog-name">${esc(d.name)}</div>
        <div class="catalog-meta">${d.type==='unit'?'ユニット':'マジック'}</div>
        <div class="catalog-desc">${esc(summary)}</div>
        ${effect?`<div class="catalog-desc">${esc(effect)}</div>`:''}
      </div>`;
    }).join('');
    return `<div class="modal" role="dialog" aria-modal="true" aria-label="カード一覧"><div class="modal-box">
      <h3>カード一覧（全${Object.keys(CARDS).length}種）</h3>
      <div class="hint">試作版の収録カードを確認できます。</div>
      <div class="catalog">${items}</div>
      <button class="btn primary" data-act="closeModal">閉じる</button>
    </div></div>`;
  }

  if(m==='rules') return `<div class="modal"><div class="modal-box">
    <h3>遊び方</h3>
    <ul>
      <li><b>勝利条件</b>：相手のライフ結晶${START_LIFE}個をすべて削る（山札が引けなくなっても負け）。</li>
      <li><b>結晶の置き場</b>：手元（すぐ使える）／熱い・冷めた（支払い済みで冷却中）／ユニットの上。</li>
      <li><b>ターン開始</b>：ユニット回復 → 冷めた結晶が手元へ、熱い結晶が冷めたへ → 結晶+1 → ライフが相手より少なければ中央プールから1個 → 1枚引く。</li>
      <li><b>召喚</b>：コスト分の結晶を払い（熱い状態へ）、さらに手元から1個をユニットに乗せる。</li>
      <li><b>乗せ替え</b>：メイン中はユニットの結晶を自由に増減できる（最低1個）。数が多いとLv2。</li>
      <li><b>オーバードライブ</b>：上限を超えて乗せるとパワーアップ＋攻撃時に特殊効果。ただしターン終了時に「超えた分＋${OD_RECOIL}個」が熱い状態になり、0個になれば退場。</li>
      <li><b>攻撃</b>：回復しているユニットで攻撃すると疲労。相手は回復しているユニットでブロックでき、パワーの低い方が退場（同じなら両方）。退場したユニットの結晶は冷めたへ。</li>
      <li><b>ダメージ</b>：ブロックされなければライフ−1。削れたライフ結晶は中央プールへ行き、劣勢の側が毎ターン1個ずつ拾えます。</li>
      <li>先攻の1ターン目はドローと攻撃ができません。</li>
    </ul>
    <button class="btn primary" data-act="closeModal">閉じる</button></div></div>`;
  if(m==='over'){
    const win=S.over==='p';
    return `<div class="modal"><div class="modal-box">
      <h3 class="${win?'res-win':'res-lose'}">${win?'勝利！':'敗北…'}</h3>
      <div>${Math.ceil(S.gameTurn/2)}ターン目で決着。ライフ あなた${S.p.life} / CPU${S.c.life}</div>
      <div class="btns"><button class="btn primary" data-act="restart">もう一度遊ぶ</button><button class="btn" data-act="closeModal">盤面を見る</button></div></div></div>`;
  }
  if(m.kind==='block'){
    const a=m.att, ad=card(a.id), ap=power(a), dmg=(isOD(a)&&ad.odFx==='pierce')?2:1;
    const opts=S.p.units.filter(u=>!u.tired).map(u=>{
      const bp=power(u), r=bp>ap?'勝ち':(bp===ap?'相打ち':'負け');
      return `<button class="btn choice" data-act="block" data-uid="${u.uid}"><span>${esc(card(u.id).name)}（パワー${bp}）</span><span>${r}</span></button>`;
    }).join('');
    return `<div class="modal"><div class="modal-box">
      <h3>${esc(ad.name)}が攻撃してきた</h3>
      <div>パワー${ap}${isOD(a)?'（オーバードライブ中）':''}。ブロックするユニットを選んでください。</div>
      ${opts}
      <button class="btn warn" data-act="block" data-uid="">ブロックしない（ライフ−${dmg}）</button></div></div>`;
  }
  return '';
}
function render(){
  const yourTurn=S.active==='p';
  const phaseText = S.over ? '対戦終了' : `${Math.ceil(S.gameTurn/2)}ターン目・${yourTurn?'あなた':'CPU'}の${S.phase==='main'?'メイン':'攻撃'}`;
  const logs=S.log.slice(-3).map(t=>`<div>${esc(t)}</div>`).join('');
  document.getElementById('app').innerHTML = `
    <header><h1>結晶オーバードライブ</h1>
      <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end"><button class="small-btn" data-act="catalog">カード</button><button class="small-btn" data-act="rules">遊び方</button><button class="small-btn" data-act="restart">最初から</button></div></header>
    ${resBar('c')}
    ${fieldHTML('c')}
    <div class="center">
      <div class="center-top"><span class="phase ${yourTurn?'you':'cpu'}">${phaseText}</span>
        <span class="pool">中央プール <span class="gem"></span><b>${S.pool}</b></span></div>
      <div class="log" aria-live="polite">${logs}</div>
    </div>
    ${fieldHTML('p')}
    ${resBar('p')}
    <div class="detail">${detailHTML()}</div>
    ${handHTML()}
    <div class="actions">
      <button class="btn" data-act="toAttack" ${myMain()?'':'disabled'}>攻撃フェイズへ</button>
      <button class="btn primary" data-act="end" ${(yourTurn && !S.busy && !S.over)?'':'disabled'}>ターン終了</button>
    </div>`;
  document.getElementById('modal-root').innerHTML = modalHTML();
}

/* ===== 入力 ===== */
document.addEventListener('click', async e=>{
  const b=e.target.closest('[data-act]'); if(!b) return;
  const act=b.dataset.act;
  if(act==='block'){
    const r=S.blockResolve; if(!r) return;
    S.blockResolve=null; S.modal=null;
    const uid=b.dataset.uid ? +b.dataset.uid : null;
    r(uid ? S.p.units.find(u=>u.uid===uid) : null); return;
  }
  if(act==='catalog'){ S.modal='catalog'; render(); return; }
  if(act==='rules'){ S.modal='rules'; render(); return; }
  if(act==='closeModal'){ S.modal=null; render(); return; }
  if(act==='restart'){ if(S.blockResolve){ const r=S.blockResolve; S.blockResolve=null; r(null); } S.modal=null; uidN=1; newGame(); return; }
  if(S.over || S.busy) return;
  S.hint='';
  if(act==='hand'){ S.targeting=null; S.sel={kind:'hand', i:+b.dataset.i}; }
  else if(act==='unit'){
    const side=b.dataset.side, uid=+b.dataset.uid;
    if(S.targeting && side==='c'){
      const i=S.targeting.i; S.targeting=null; S.sel=null;
      playCard('p',i,uid);
    } else { S.sel={kind:'unit', side, uid}; }
  }
  else if(act==='cancelT'){ S.targeting=null; }
  else if(act==='play' && myMain() && S.sel && S.sel.kind==='hand'){
    const i=S.sel.i, d=card(S.p.hand[i]);
    if(canPlay('p',i)){
      if(d.target){
        if(!S.c.units.length) S.hint='対象にできる相手のユニットがいません。';
        else { S.targeting={i}; S.sel=null; }
      } else { playCard('p',i); S.sel=null; }
    }
  }
  else if((act==='plus'||act==='minus') && myMain() && S.sel && S.sel.kind==='unit'){
    const u=S.p.units.find(x=>x.uid===S.sel.uid);
    if(u){ const d=card(u.id);
      if(act==='plus' && S.p.stock>0 && u.cr<d.cap+OD_MAX_OVER){ S.p.stock--; u.cr++; }
      if(act==='minus' && u.cr>1){ S.p.stock++; u.cr--; } }
  }
  else if(act==='toAttack' && myMain()){
    if(S.gameTurn===1) S.hint='先攻の1ターン目は攻撃できません。ターン終了してください。';
    else { S.phase='attack'; S.sel=null; S.targeting=null; }
  }
  else if(act==='atk' && myAttack() && S.sel && S.sel.kind==='unit'){
    const u=S.p.units.find(x=>x.uid===S.sel.uid);
    if(u && !u.tired && !u.attacked){ const g=S.gid; S.busy=true; S.sel=null; await attack('p',u); if(S.gid!==g) return; if(!S.over) S.busy=false; }
  }
  else if(act==='end' && S.active==='p'){
    S.busy=true; await endTurn(); return;
  }
  render();
});

newGame();
