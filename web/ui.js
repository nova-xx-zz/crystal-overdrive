"use strict";


/* ===== ラフ画準拠のカードアート（外部アセット不要） ===== */
function silhouette(id){
  const paths = {
    risu:'<path d="M13 76 L25 60 L28 42 L43 36 L38 26 L52 34 L65 29 L60 39 L79 45 L88 60 L74 57 L71 66 L84 77 L63 73 L53 88 L39 71 L22 85 Z"/><circle cx="70" cy="51" r="2.8" fill="#f2f4f7"/>',
    totsu:'<circle cx="52" cy="24" r="11"/><path d="M39 39 L63 39 L75 63 L68 92 L37 92 L31 63 Z"/><path d="M33 44 L22 64 L16 61 L29 38 Z M70 44 L82 68 L89 65 L76 38 Z"/><path d="M20 15 L24 15 L24 62 L20 62 Z M16 19 L28 19 L28 24 L16 24 Z"/>',
    volga:'<path d="M8 76 L27 56 L35 34 L48 22 L50 9 L60 24 L77 16 L72 31 L91 38 L83 49 L98 57 L79 62 L73 74 L54 71 L38 90 L27 74 Z"/><path d="M30 59 L7 41 L22 26 L41 45 Z"/><circle cx="75" cy="42" r="3" fill="#f1f3f6"/>',
    pen:'<ellipse cx="51" cy="56" rx="29" ry="38"/><ellipse cx="51" cy="61" rx="17" ry="24" fill="#edf0f4"/><path d="M25 47 L6 57 L25 65 Z M77 47 L96 57 L77 65 Z"/><path d="M43 23 L36 12 L47 19 L55 13 L61 24"/><path d="M46 45 L67 50 L46 55" fill="#edf0f4"/>',
    kan:'<circle cx="50" cy="25" r="11"/><path d="M30 45 Q48 33 70 45 L78 90 L22 90 Z"/><path d="M28 49 L16 78 L30 82 L41 59 Z M72 49 L84 78 L70 82 L59 59 Z"/><path d="M45 13 Q49 5 59 11 L58 24 L42 24 Z"/>',
    shimo:'<path d="M50 8 L79 21 L77 57 Q69 81 50 93 Q31 81 23 57 L21 21 Z"/><path d="M50 22 L65 30 L64 54 Q60 69 50 77 Q40 69 36 54 L35 30 Z" fill="#e9edf1"/><path d="M8 12 L13 12 L13 81 L8 81 Z M5 18 L16 18 L16 24 L5 24 Z"/>',
    koke:'<path d="M23 89 L19 64 L29 42 L27 23 L42 31 L49 15 L59 30 L75 23 L73 46 L83 69 L78 89 L61 88 L60 68 L40 68 L39 88 Z"/><rect x="12" y="49" width="17" height="29" rx="7"/><rect x="72" y="49" width="17" height="29" rx="7"/>',
    saku:'<path d="M24 79 L15 56 L26 37 L42 32 L48 19 L57 33 L76 37 L87 56 L78 79 L63 70 L50 88 L37 70 Z"/><path d="M14 21 L23 13 L75 80 L68 87 Z"/><circle cx="69" cy="53" r="3" fill="#eef2f4"/>',
    reikyaku:'<path d="M56 5 L22 48 L45 48 L34 94 L80 38 L56 38 Z"/>',
    kudaki:'<path d="M45 5 L72 23 L61 50 L82 69 L54 94 L17 67 L34 40 L22 25 Z"/><path d="M43 8 L45 43 L24 67 M61 50 L40 65 L54 94" fill="none" stroke="#ecf0f4" stroke-width="5"/>',
    kiri:'<path d="M15 75 Q31 56 46 69 Q60 79 77 60 Q88 51 95 63 L95 82 L5 82 Z"/><path d="M15 52 Q34 27 50 42 Q66 53 83 30" fill="none" stroke="#929ba5" stroke-width="11" stroke-linecap="round"/>',
    hokyu:'<path d="M39 11 L60 11 L60 32 L76 64 Q78 79 62 86 L38 86 Q22 79 24 64 L39 32 Z"/><path d="M34 58 Q49 65 67 54 L68 75 Q50 88 32 75 Z" fill="#e7eaee"/>'
  };
  return '<svg class="card-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false" fill="#939ba5">'+(paths[id]||paths.kan)+'</svg>';
}
function portraitIcon(cpu){
  return '<svg class="hero-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false" fill="#59616b">'+
   (cpu
    ? '<path d="M15 85 L28 58 L18 47 Q26 13 49 8 Q77 12 83 47 L72 62 L90 85 L70 92 L47 81 L28 92 Z"/><path d="M31 50 L51 27 L71 49 L62 72 L40 72 Z" fill="#d8dce1"/>'
    : '<path d="M16 91 L23 69 L34 58 L22 51 L29 31 L41 35 L47 16 L54 32 L69 23 L72 42 L82 46 L73 61 L86 74 L89 91 Z"/><path d="M29 70 L48 78 L68 65 L77 75 L54 96 Z" fill="#e3e7ed"/>')
    +'</svg>';
}
function deckBadge(s){
  return '<div class="pile-box deck-pile"><b>デッキ</b><span class="pile-value"><span class="pile-symbol">▱</span><strong>'+S[s].deck.length+'</strong></span></div>';
}
function graveBadge(s){
  return '<div class="pile-box grave-pile"><b>墓地 <small>(捨て札)</small></b><span class="pile-value"><span class="grave-symbol">✝</span><strong>'+(S[s].grave||0)+'</strong></span></div>';
}
function lifeBadge(s){
  return '<div class="life-display"><b>HP</b><strong aria-label="残りライフ'+S[s].life+'">'+S[s].life+'</strong></div>';
}
function crystalBadge(s){
  const p=S[s]; let dots='';
  for(let i=0;i<5;i++)dots+='<i class="crystal-pip '+(i<p.stock?'on':'')+'"></i>';
  return '<div class="crystal-box" aria-label="手元の結晶'+p.stock+'個、熱い'+p.hot+'個、冷めた'+p.cool+'個"><b>コスト<small>(結晶)</small></b><span class="crystal-dots">'+dots+'</span><strong>'+p.stock+'個</strong><span class="crystal-cooling">熱 '+p.hot+' / 冷 '+p.cool+'</span></div>';
}
function boardHTML(s){
  return '<div class="lane-label">'+(s==='c'?'相手の場':'場')+'<small>(バトルフィールド)</small></div>'+fieldHTML(s);
}
function progressHTML(){
  const turn=Math.ceil(S.gameTurn/2),you=S.active==='p';
  return '<div class="turn-pill">ターン '+turn+'</div>'+
    '<div class="phase-rail"><strong>'+(S.over?'対戦終了':(you?(S.phase==='main'?'メインフェイズ':'バトルフェイズ'):'相手のターン'))+'</strong>'+
    '<div class="phase-steps"><span class="'+(S.phase==='main'?'on':'')+'">●<small>メイン</small></span><i>›</i><span class="'+(S.phase==='attack'?'on':'')+'">●<small>バトル</small></span><i>›</i><span>○<small>エンド</small></span></div>'+
    '<button class="phase-next" data-act="toAttack" '+(myMain()?'':'disabled')+'>攻撃フェイズへ ›</button></div>'+
    '<div class="resource-status"><span>中央プール <b>◆ '+S.pool+'</b></span><span class="resource-log">'+esc(S.log.at(-1)||'')+'</span></div>';
}



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
  const d=card(u.id);
  const sel=!!(S.sel && S.sel.kind==='unit' && S.sel.uid===u.uid);
  const tgt=!!(S.targeting && side==='c');
  let dots='';
  for(let i=0;i<d.cap+OD_MAX_OVER;i++)dots+='<span class="dot'+(i<u.cr?' on':'')+(i>=d.cap?' ov':'')+'"></span>';
  return '<button class="unit '+d.attr+(u.tired?' tired':'')+(isOD(u)?' od':'')+(sel?' sel':'')+(tgt?' tgt':'')+(S.flash===u.uid?' hit':'')+'" data-act="unit" data-side="'+side+'" data-uid="'+u.uid+'" aria-pressed="'+sel+'" aria-label="'+esc(d.name)+' パワー'+power(u)+(tgt?' 対象に指定':'')+'">'+
    '<span class="unit-top"></span><span class="unit-art">'+silhouette(u.id)+'</span><span class="unit-name">'+esc(d.name)+'</span>'+
    '<span class="unit-bottom"><span class="unit-stat">'+power(u)+'</span><span class="unit-stat">'+u.cr+'</span></span>'+
    '<span class="unit-dots">'+dots+'</span>'+(u.tired?'<span class="tag">疲労</span>':'')+'</button>';
}
function fieldHTML(s){
  const us=S[s].units; let h=us.map(u=>unitHTML(u,s)).join('');
  for(let i=us.length;i<MAX_UNITS;i++)h+='<div class="slot" aria-hidden="true"><span>＋</span></div>';
  return '<div class="field">'+h+'<div class="slot landscape-extra" aria-hidden="true"><span>＋</span></div></div>';
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
  return '<div class="hand">'+S.p.hand.map((id,i)=>{
    const d=card(id),ok=myMain()&&canPlay('p',i),sel=!!(S.sel&&S.sel.kind==='hand'&&S.sel.i===i);
    return '<button class="card '+d.attr+(d.type==='spell'?' spell':'')+(ok?'':' dim')+(sel?' sel':'')+'" data-act="hand" data-i="'+i+'" aria-pressed="'+sel+'" aria-label="'+esc(d.name)+' コスト'+d.cost+'">'+
     '<span class="cost">'+d.cost+'</span><span class="card-top"></span><span class="card-picture">'+silhouette(id)+'</span>'+
     '<span class="card-name">'+esc(d.name)+'</span><span class="card-stats">'+(d.type==='unit'?d.pow[0]+' / '+d.pow[1]:'マジック')+'</span></button>';
  }).join('')+'</div>';
}

function modalHTML(){
  const m=S.modal; if(!m) return '';
  if(m==='menu') return '<div class="modal" role="dialog" aria-modal="true" aria-label="設定メニュー"><div class="modal-box"><h3>設定メニュー</h3><button class="btn" data-act="catalog">カード一覧・効果確認</button><button class="btn" data-act="rules">遊び方</button><button class="btn" data-act="restart">対戦を最初から</button><button class="btn primary" data-act="closeModal">閉じる</button></div></div>';
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

/* ===== Capacitor iOS 正式対戦画面：ラフ画準拠（縦横レスポンシブ） ===== */
function render(){
  const you=S.active==='p';
  const detailOpen=!!(S.sel || S.targeting);
  document.getElementById('app').innerHTML = '<main class="ios-board">'+
    '<h1 class="visually-hidden">結晶オーバードライブ</h1>'+
    '<button class="settings-menu" data-act="menu" aria-label="設定メニュー"><span class="hamburger">☰</span><small>設定<br>メニュー</small></button>'+
    '<section class="opponent-panel battlefield-panel" aria-label="相手の情報と場">'+
      '<span class="side-flag">相手</span>'+
      '<div class="opponent-head">'+
       '<div class="opponent-deck">'+deckBadge('c')+'</div>'+
       '<div class="opponent-avatar avatar-ring">'+portraitIcon(true)+'</div>'+
       '<div class="opponent-right">'+lifeBadge('c')+graveBadge('c')+'</div>'+
      '</div>'+
      '<div class="opponent-lane lane">'+boardHTML('c')+'</div>'+
    '</section>'+
    '<section class="middle-panel battlefield-panel" aria-label="ターンとバトルフィールド">'+
      '<div class="progress-panel">'+progressHTML()+'</div>'+
      '<div class="player-lane lane">'+boardHTML('p')+'</div>'+
    '</section>'+
    '<section class="player-panel battlefield-panel" aria-label="自分の情報と手札">'+
      '<span class="side-flag">自分</span>'+
      '<div class="player-head">'+
       '<span class="player-avatar avatar-ring">'+portraitIcon(false)+'</span>'+
       lifeBadge('p')+crystalBadge('p')+
      '</div>'+
      '<div class="player-piles">'+deckBadge('p')+graveBadge('p')+'</div>'+
      '<div class="hand-box"><span class="hand-label">手札<small>(ハンド)</small></span>'+handHTML()+'</div>'+
    '</section>'+
    '<footer class="battle-footer">'+
      '<button class="effect-button" data-act="inspect"><span class="info-circle">i</span><span>効果確認<small>(詳細)</small></span></button>'+
      '<button class="end-button" data-act="end" '+(you&&!S.busy&&!S.over?'':'disabled')+'><span class="double-arrow">▶▶</span> ターン終了</button>'+
    '</footer>'+
    '<div class="detail '+(detailOpen?'open':'')+'" aria-label="選択中のカード詳細" '+(detailOpen?'role="dialog"':'')+'>'+
      '<button class="dismiss-detail" data-act="dismissDetail" aria-label="詳細を閉じる">×</button>'+detailHTML()+
    '</div>'+
   '</main>';
  document.getElementById('modal-root').innerHTML=modalHTML();
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
  if(act==='menu'){ S.modal='menu'; render(); return; }
  if(act==='inspect'){ S.modal='catalog'; render(); return; }
  if(act==='dismissDetail'){ S.sel=null; S.targeting=null; render(); return; }
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
