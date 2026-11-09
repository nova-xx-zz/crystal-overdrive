#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Capacitor 8で生成したXcodeプロジェクトのiPhone対応方向を明示する。
// 画面回転はInfo.plistの対応方向とCSSメディアクエリの両方が必要。
const ORIENTATIONS = [
  'UIInterfaceOrientationPortrait',
  'UIInterfaceOrientationLandscapeLeft',
  'UIInterfaceOrientationLandscapeRight',
];
const key = 'UISupportedInterfaceOrientations';
const orientationBlock = '<key>' + key + '</key>\n\t<array>\n' +
  ORIENTATIONS.map(value => '\t\t<string>' + value + '</string>').join('\n') +
  '\n\t</array>';

function withOrientations(xml) {
  if (!xml.includes('<plist') || !xml.includes('</dict>')) {
    throw new Error('Info.plistの構造を確認できません');
  }
  const existing = /<key>UISupportedInterfaceOrientations<\/key>\s*<array>[\s\S]*?<\/array>/;
  if (existing.test(xml)) return xml.replace(existing, orientationBlock);
  return xml.replace(/<\/dict>/, '\t' + orientationBlock + '\n</dict>');
}

if (require.main === module) {
  const plist = path.join(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');
  if (!fs.existsSync(plist)) {
    console.error('iOSプロジェクトが見つかりません。初回は npm run ios:add を実行してください。');
    process.exitCode = 1;
  } else {
    const original = fs.readFileSync(plist, 'utf8');
    const result = withOrientations(original);
    if (result !== original) fs.writeFileSync(plist, result);
    console.log('iPhoneの縦向き・左横向き・右横向きを設定しました。');
  }
}

module.exports = { withOrientations, ORIENTATIONS };
