"use strict";

// DOM-free deck validation and versioned local persistence. Offline data is not
// authoritative ownership or a source of online rewards.
const DeckSystem = (() => {
  const KEY = 'crystal-overdrive.profile.v1';
  const MAX_DECKS = 30, MAX_BYTES = 100000;
  const clone = value => JSON.parse(JSON.stringify(value));
  const integer = n => Number.isSafeInteger(n) && n >= 0;
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const known = (master, id) => typeof id === 'string' && Object.prototype.hasOwnProperty.call(master,id);

  function validateDeck(cards, master, counts) {
    const errors = [];
    if (!Array.isArray(cards)) return {valid:false, errors:[{code:'format', message:'カードの形式が正しくありません'}]};
    if (cards.length !== 20) errors.push({code:'size', message:`20枚必要です（現在${cards.length}枚）`});
    const used = new Map();
    for (const id of cards) {
      if (!known(master,id)) { errors.push({code:'unknown', message:'未対応のカードが含まれています'}); continue; }
      used.set(id,(used.get(id)||0)+1);
    }
    for (const [id,n] of used) {
      if (n > 2) errors.push({code:'copies', id, message:`${master[id].name}は2枚までです`});
      if (counts && (!integer(counts[id]) || n > counts[id])) errors.push({code:'owned', id, message:`${master[id].name}の所持枚数が足りません`});
    }
    return {valid:errors.length===0, errors};
  }

  function initialProfile(master, starter) {
    return {schemaVersion:1, revision:0, decks:[{id:'starter',name:'はじめてのデッキ',cards:starter.slice()}], activeDeckId:'starter',
      collection:{source:'offline-starter', counts:Object.fromEntries(Object.keys(master).map(id=>[id,2]))}};
  }

  function validProfile(profile, master) {
    if (!object(profile) || profile.schemaVersion!==1 || !integer(profile.revision) || !Array.isArray(profile.decks) ||
        profile.decks.length>MAX_DECKS || !object(profile.collection) || profile.collection.source!=='offline-starter' || !object(profile.collection.counts)) return false;
    const counts=profile.collection.counts;
    if (Object.keys(counts).some(id=>!known(master,id) || !integer(counts[id]) || counts[id]>1000000000)) return false;
    if (Object.keys(master).some(id=>!integer(counts[id]))) return false;
    const ids=new Set();
    for (const deck of profile.decks) {
      if (!object(deck) || typeof deck.id!=='string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(deck.id) || ids.has(deck.id) ||
          typeof deck.name!=='string' || !deck.name.trim() || deck.name.length>32 || !Array.isArray(deck.cards) || deck.cards.length>20 ||
          deck.cards.some(id=>!known(master,id))) return false;
      ids.add(deck.id);
    }
    return profile.activeDeckId===null ? ids.size===0 : ids.has(profile.activeDeckId);
  }

  function createStore({master, starter, storage}) {
    let profile=initialProfile(master,starter), raw=null, writable=true, message='';
    try {
      if (!storage) throw new Error('unavailable');
      raw=storage.getItem(KEY);
      if (raw!==null) {
        if (raw.length>MAX_BYTES) throw new Error('format');
        const parsed=JSON.parse(raw);
        if (!validProfile(parsed,master)) throw new Error('format');
        profile=parsed;
      }
    } catch {
      writable=false;
      message=raw!==null ? '保存データを読み込めません。既存データを保護しています。バックアップを書き出して確認してください。' : 'この環境では保存領域を利用できません。保存はできませんが初期デッキで対戦できます。';
    }

    function commit(next) {
      if (!writable) return {ok:false,message};
      try {
        if (storage.getItem(KEY)!==raw) return {ok:false,message:'別の画面で保存データが更新されました。編集内容を控え、再読み込みしてください。'};
        next=clone(next); next.revision=profile.revision+1;
        if (!validProfile(next,master)) return {ok:false,message:'デッキの保存形式が正しくありません'};
        const encoded=JSON.stringify(next);
        if (encoded.length>MAX_BYTES) return {ok:false,message:'保存できるデータ量を超えました'};
        storage.setItem(KEY,encoded);
        profile=next; raw=encoded;
        return {ok:true};
      } catch {
        return {ok:false,message:'保存できませんでした。空き容量や保存設定を確認してください。編集内容と以前の保存は保持しています。'};
      }
    }

    return {
      getProfile:()=>clone(profile),
      getNotice:()=>message,
      backup:()=>raw===null ? JSON.stringify(profile,null,2) : raw,
      saveDeck(deck) {
        const next=clone(profile), index=next.decks.findIndex(d=>d.id===deck.id);
        if (index<0 && next.decks.length>=MAX_DECKS) return {ok:false,message:`保存は${MAX_DECKS}個までです`};
        if (index<0) next.decks.push(clone(deck)); else next.decks[index]=clone(deck);
        next.activeDeckId=deck.id;
        return commit(next);
      },
      removeDeck(id) {
        const next=clone(profile);
        if (!next.decks.some(d=>d.id===id)) return {ok:false,message:'デッキが見つかりません'};
        next.decks=next.decks.filter(d=>d.id!==id);
        if (next.activeDeckId===id) next.activeDeckId=next.decks[0]?.id||null;
        return commit(next);
      },
      selectDeck(id) {
        const next=clone(profile);
        if (!next.decks.some(d=>d.id===id)) return {ok:false,message:'デッキが見つかりません'};
        next.activeDeckId=id;
        return commit(next);
      },
    };
  }
  return {KEY, MAX_DECKS, validateDeck, initialProfile, createStore};
})();
if (typeof module !== 'undefined') module.exports=DeckSystem;
