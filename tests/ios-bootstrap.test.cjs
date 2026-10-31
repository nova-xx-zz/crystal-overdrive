'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const config = JSON.parse(read('capacitor.config.json'));
const pkg = JSON.parse(read('package.json'));
const html = read('web/index.html');

test('iOS実機検証はWeb版をアプリ内に同梱する設定', () => {
  assert.equal(config.webDir, 'web');
  assert.match(config.appId, /^[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*){2,}$/);
  assert.ok(config.appName.length > 0);
  assert.equal(config.server, undefined, 'リモートWebサイトへの依存を作らない');
  assert.ok(fs.existsSync(path.join(ROOT, config.webDir, 'index.html')));
});

test('Capacitorのメジャーバージョンを揃え、操作コマンドを用意する', () => {
  const packages = [pkg.dependencies['@capacitor/core'], pkg.dependencies['@capacitor/ios'], pkg.devDependencies['@capacitor/cli']];
  assert.deepEqual(packages, ['8.6.0', '8.6.0', '8.6.0']);
  assert.equal(pkg.scripts['ios:add'], 'cap add ios');
  assert.equal(pkg.scripts['ios:sync'], 'cap sync ios');
  assert.equal(pkg.scripts['ios:open'], 'cap open ios');
  assert.equal(pkg.scripts['ios:run'], 'cap run ios');
});

test('iOSで必要なローカルのCSSとJSファイルがすべて存在する', () => {
  const paths = [
    ...[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(x => x[1]),
    ...[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\.\/[^"]+)"/g)].map(x => x[1]),
  ];
  assert.deepEqual(paths.filter(x=>x.endsWith('.js')), ['./cards.js', './game.js', './ui.js']);
  assert.ok(paths.includes('./styles.css'));
  for (const src of paths) {
    assert.ok(src.startsWith('./'), src + ' はアプリに同梱される相対パスにする');
    assert.ok(fs.existsSync(path.join(ROOT, 'web', src)), src + ' が存在しません');
  }
});
