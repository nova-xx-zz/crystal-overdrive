"use strict";

const deckStore=DeckSystem.createStore({master:CARDS,starter:DECK_LIST,storage:(()=>{try{return globalThis.localStorage||null;}catch{return null;}})()});
let deckEditor=null, deckMessage='', deckDeleteId=null, deckIdCounter=0;
let deckFilters={search:'',attr:'',type:'',cost:''};
const selectedDeck=()=>{const p=deckStore.getProfile();return p.decks.find(d=>d.id===p.activeDeckId)||null;};
const deckCheck=deck=>DeckSystem.validateDeck(deck?.cards,CARDS,deckStore.getProfile().collection.counts);

function beginDeckMatch(){
  const deck=selectedDeck(), check=deckCheck(deck);
  if(!check.valid){
    if(S.busy){S.hint='CPUの行動後にデッキを選んでください';render();return false;}
    deckMessage=check.errors.map(e=>e.message).join(' / ');S.modal='decks';render();return false;
  }
  if(S.blockResolve){const resolve=S.blockResolve;S.blockResolve=null;resolve(null);}
  uidN=1;
  newGame(deck.cards);
  return true;
}

function deckLibraryHTML(){
  const profile=deckStore.getProfile();
  const notice=deckMessage||deckStore.getNotice();
  return '<div class="modal" role="dialog" aria-modal="true" aria-label="保存デッキ"><div class="modal-box deck-library">'+
    '<div class="deck-toolbar"><h3>保存デッキ</h3><button class="btn" data-act="closeModal">対戦に戻る</button></div>'+
    '<p>20枚・同名2枚まで。オフライン試用カードは各2枚利用できます。選んだデッキは次の対戦から使います。</p>'+
    (notice?'<p class="deck-notice" role="status">'+esc(notice)+'</p>':'')+
    '<div class="deck-actions"><button class="btn primary" data-act="deckNew" '+(profile.decks.length>=DeckSystem.MAX_DECKS?'disabled':'')+'>新しいデッキ</button><button class="btn" data-act="deckBackup">保存データを書き出す</button></div>'+
    '<div class="deck-list">'+profile.decks.map(deck=>{
      const check=deckCheck(deck),active=deck.id===profile.activeDeckId;
      return '<article class="deck-summary" data-deck="'+deck.id+'"><div><h4>'+esc(deck.name)+(active?' <small>選択中</small>':'')+'</h4><p>'+deck.cards.length+' / 20枚</p></div>'+
        '<span class="'+(check.valid?'deck-valid':'deck-invalid')+'">'+(check.valid?'対戦できます':'編集中')+'</span>'+
        '<div class="deck-actions"><button class="btn" data-act="deckEdit" data-id="'+deck.id+'">編集</button><button class="btn" data-act="deckDuplicate" data-id="'+deck.id+'">複製</button>'+
        '<button class="btn" data-act="deckSelect" data-id="'+deck.id+'" '+(active?'disabled':'')+'>選ぶ</button><button class="btn warn" data-act="deckDelete" data-id="'+deck.id+'">削除</button></div></article>';
    }).join('')+(profile.decks.length?'':'<p>デッキがありません。「新しいデッキ」から作成してください。</p>')+'</div>'+
    '<div class="deck-actions deck-sticky"><button class="btn primary" data-act="deckStart" '+(deckCheck(selectedDeck()).valid?'':'disabled')+'>選択デッキで対戦を始める</button></div></div></div>';
}

function deckEditorHTML(){
  if(!deckEditor)return deckLibraryHTML();
  const owned=deckStore.getProfile().collection.counts, cards=deckEditor.cards, check=deckCheck(deckEditor);
  const counts=Object.fromEntries(Object.keys(CARDS).map(id=>[id,cards.filter(x=>x===id).length]));
  const query=deckFilters.search.toLocaleLowerCase();
  const items=Object.entries(CARDS).filter(([id,d])=>{
    const text=d.name+' '+(d.type==='spell'?FX_TEXT[d.fx]:FX_TEXT[d.odFx]+' '+(FX_TEXT[d.onSummon]||''));
    return (!query||text.toLocaleLowerCase().includes(query)) && (!deckFilters.attr||d.attr===deckFilters.attr) &&
      (!deckFilters.type||d.type===deckFilters.type) && (deckFilters.cost===''||d.cost===Number(deckFilters.cost));
  }).map(([id,d])=>'<article class="deck-entry '+d.attr+'" data-card-id="'+id+'">'+silhouette(id)+'<h4>'+esc(d.name)+'</h4><span>コスト '+d.cost+' / '+(d.type==='unit'?'ユニット':'マジック')+'</span>'+
    '<p>'+(d.type==='unit'?'パワー '+d.pow.join(' / ')+'・OD: '+esc(FX_TEXT[d.odFx]):esc(FX_TEXT[d.fx]))+'</p>'+
    '<div class="deck-counts"><span>所持 '+owned[id]+'枚 / 採用 <b>'+counts[id]+'</b>枚</span><span><button class="btn" data-act="deckRemoveCard" data-id="'+id+'" aria-label="'+esc(d.name)+'を1枚減らす" '+(counts[id]?'':'disabled')+'>−</button> '+
    '<button class="btn primary" data-act="deckAddCard" data-id="'+id+'" aria-label="'+esc(d.name)+'を1枚加える" '+(cards.length<20&&counts[id]<Math.min(2,owned[id])?'':'disabled')+'>＋</button></span></div></article>').join('');
  const options=(values,current)=>values.map(([v,label])=>'<option value="'+v+'" '+(v===current?'selected':'')+'>'+label+'</option>').join('');
  return '<div class="modal" role="dialog" aria-modal="true" aria-label="デッキ編集"><div class="modal-box deck-library">'+
    '<div class="deck-toolbar"><h3>デッキ編集</h3><button class="btn" data-act="deckCancel">保存せず戻る</button></div>'+
    '<label>デッキ名<input class="deck-name" data-deck-field="name" maxlength="32" value="'+esc(deckEditor.name)+'"></label>'+
    (deckMessage?'<p class="deck-notice" role="status">'+esc(deckMessage)+'</p>':'')+
    '<div class="deck-filters"><label class="search-filter">名前・効果<input class="deck-search" type="search" data-deck-field="search" value="'+esc(deckFilters.search)+'"></label>'+
    '<label>色<select data-deck-field="attr">'+options([['','すべて'],['r','赤'],['b','青'],['g','緑']],deckFilters.attr)+'</select></label>'+
    '<label>種類<select data-deck-field="type">'+options([['','すべて'],['unit','ユニット'],['spell','マジック']],deckFilters.type)+'</select></label>'+
    '<label>コスト<select data-deck-field="cost">'+options([['','すべて'],...Array.from({length:5},(_,i)=>[String(i+1),String(i+1)])],deckFilters.cost)+'</select></label></div>'+
    '<div class="deck-grid">'+(items||'<p>条件に合うカードがありません。</p>')+'</div>'+
    '<div class="deck-sticky"><div class="deck-counts"><strong>'+cards.length+' / 20枚</strong><span class="'+(check.valid?'deck-valid':'deck-invalid')+'">'+(check.valid?'対戦できます':'編集中')+'</span></div>'+
    (!check.valid?'<ul class="deck-errors">'+check.errors.map(e=>'<li>'+esc(e.message)+'</li>').join('')+'</ul>':'')+
    '<button class="btn primary" data-act="deckSave">デッキを保存する</button></div></div></div>';
}

function deckDeleteHTML(){
  const deck=deckStore.getProfile().decks.find(d=>d.id===deckDeleteId);
  return '<div class="modal" role="dialog" aria-modal="true" aria-label="デッキ削除の確認"><div class="modal-box"><h3>デッキを削除</h3><p>「'+esc(deck?.name||'')+'」を削除します。</p>'+
    (deckMessage?'<p class="deck-notice" role="status">'+esc(deckMessage)+'</p>':'')+
    '<div class="btns"><button class="btn" data-act="deckCancelDelete">戻る</button><button class="btn warn" data-act="deckConfirmDelete">削除する</button></div></div></div>';
}

function renderDeckModal(){
  const root=document.getElementById('modal-root');
  const active=document.activeElement, field=active?.dataset?.deckField, caret=active?.selectionStart;
  const scroll=root.querySelector?.('.modal-box')?.scrollTop||0;
  root.innerHTML=modalHTML();
  const box=root.querySelector?.('.modal-box');if(box)box.scrollTop=scroll;
  if(field){const input=root.querySelector?.('[data-deck-field="'+field+'"]');input?.focus();if(typeof caret==='number')input?.setSelectionRange?.(caret,caret);}
}

function handleDeckAction(act, dataset){
  if(!act.startsWith('deck'))return false;
  if(S.busy)return true;
  const profile=deckStore.getProfile(), find=()=>profile.decks.find(d=>d.id===dataset.id);
  const newId=()=> 'deck-'+Date.now().toString(36)+'-'+(++deckIdCounter);
  const result=operation=>{const r=operation();deckMessage=r.ok?'保存しました':r.message;return r.ok;};
  if(act==='decks'){deckMessage='';S.modal='decks';}
  if(act==='deckNew'){deckEditor={id:newId(),name:'新しいデッキ',cards:[]};deckMessage='';deckFilters={search:'',attr:'',type:'',cost:''};S.modal='deckEdit';}
  if(act==='deckEdit'&&find()){deckEditor=find();deckMessage='';deckFilters={search:'',attr:'',type:'',cost:''};S.modal='deckEdit';}
  if(act==='deckDuplicate'&&find()){deckEditor={...find(),id:newId(),name:(find().name+' のコピー').slice(0,32)};deckMessage='';deckFilters={search:'',attr:'',type:'',cost:''};S.modal='deckEdit';}
  if(act==='deckCancel'){deckEditor=null;deckMessage='';S.modal='decks';}
  if(act==='deckAddCard'&&deckEditor&&Object.prototype.hasOwnProperty.call(CARDS,dataset.id)){
    if(deckEditor.cards.length<20&&deckEditor.cards.filter(id=>id===dataset.id).length<Math.min(2,profile.collection.counts[dataset.id]))deckEditor.cards.push(dataset.id);
    deckMessage='';
  }
  if(act==='deckRemoveCard'&&deckEditor){const i=deckEditor.cards.indexOf(dataset.id);if(i>=0)deckEditor.cards.splice(i,1);deckMessage='';}
  if(act==='deckSave'&&deckEditor){
    if(!deckEditor.name.trim()){deckMessage='デッキ名を入力してください';}
    else if(result(()=>deckStore.saveDeck({...deckEditor,name:deckEditor.name.trim()}))){deckEditor=null;S.modal='decks';}
  }
  if(act==='deckSelect')result(()=>deckStore.selectDeck(dataset.id));
  if(act==='deckDelete'){deckDeleteId=dataset.id;deckMessage='';S.modal='deckDelete';}
  if(act==='deckCancelDelete')S.modal='decks';
  if(act==='deckConfirmDelete'){if(result(()=>deckStore.removeDeck(deckDeleteId)))S.modal='decks';}
  if(act==='deckStart'){beginDeckMatch();return true;}
  if(act==='deckBackup'){
    const link=document.createElement('a'),url=URL.createObjectURL(new Blob([deckStore.backup()],{type:'application/json'}));
    link.href=url;link.download='crystal-overdrive-profile-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  renderDeckModal();return true;
}

function deckInput(event){
  const field=event.target.dataset?.deckField;
  if(!field||!deckEditor)return;
  if(field==='name'){deckEditor.name=event.target.value;return;}
  if(Object.prototype.hasOwnProperty.call(deckFilters,field)){deckFilters[field]=event.target.value;renderDeckModal();}
}
document.addEventListener('input',deckInput);
document.addEventListener('change',deckInput);
