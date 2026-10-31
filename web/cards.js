"use strict";
/* ===== カード定義 ===== */
const CARDS = {
  risu:  {type:'unit',attr:'r',sig:'火',name:'火花リス',     cost:1,lv2:2,cap:2,pow:[2,3],od:2,odFx:'burn'},
  totsu: {type:'unit',attr:'r',sig:'突',name:'紅蓮の突撃兵', cost:3,lv2:3,cap:3,pow:[4,6],od:3,odFx:'pierce'},
  volga: {type:'unit',attr:'r',sig:'竜',name:'熔岩竜ヴォルガ',cost:5,lv2:3,cap:4,pow:[6,9],od:3,odFx:'burnAll'},
  pen:   {type:'unit',attr:'b',sig:'氷',name:'氷晶ペンギン', cost:1,lv2:2,cap:3,pow:[1,3],od:2,odFx:'cool'},
  kan:   {type:'unit',attr:'b',sig:'観',name:'蒼き観測者',   cost:2,lv2:3,cap:3,pow:[2,4],od:2,odFx:'cool',onSummon:'draw'},
  shimo: {type:'unit',attr:'b',sig:'鎧',name:'霜鎧の守護者', cost:3,lv2:3,cap:4,pow:[3,6],od:2,odFx:'stand'},
  koke:  {type:'unit',attr:'g',sig:'巨',name:'苔むす巨像',   cost:4,lv2:4,cap:5,pow:[5,8],od:2,odFx:'stand'},
  saku:  {type:'unit',attr:'g',sig:'掘',name:'森の採掘者',   cost:2,lv2:2,cap:3,pow:[2,4],od:2,odFx:'pierce',onSummon:'gain'},
  reikyaku:{type:'spell',attr:'b',sig:'冷',name:'緊急冷却',cost:1,fx:'coolAll'},
  kudaki:  {type:'spell',attr:'r',sig:'砕',name:'結晶砕き',cost:3,fx:'shatter',target:true},
  kiri:    {type:'spell',attr:'b',sig:'霧',name:'凍結の霧',cost:2,fx:'freeze',target:true},
  hokyu:   {type:'spell',attr:'g',sig:'補',name:'補給線',  cost:2,fx:'draw2'},
};
const FX_TEXT = {
  burn:'相手ユニット1体（結晶が一番多いもの）の結晶1個を中央プールへ',
  burnAll:'相手ユニットすべての結晶を1個ずつ中央プールへ',
  pierce:'ブロックされなければ2ダメージ',
  cool:'自分の「熱い」結晶1個を手元へ戻す',
  stand:'バトルの後、このユニットを回復する',
  draw:'召喚時：カードを1枚引く',
  gain:'召喚時：中央プールから結晶1個を手元へ',
  coolAll:'自分の「熱い」結晶をすべて「冷めた」へ進める',
  shatter:'相手ユニット1体の結晶2個を中央プールへ',
  freeze:'相手ユニット1体を疲労させる',
  draw2:'カードを2枚引く',
};
const DECK_LIST = ['risu','risu','totsu','totsu','volga','volga','pen','pen','kan','kan',
  'shimo','shimo','koke','koke','saku','saku','reikyaku','kudaki','kiri','hokyu'];
const START_LIFE = 5, START_STOCK = 3, START_HAND = 4, MAX_UNITS = 4;
const OD_MAX_OVER = 2;   // 上限を何個まで超えられるか
const OD_RECOIL = 2;     // 過負荷の反動：超えた分＋この数
