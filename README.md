# crystal-overdrive

結晶（クリスタル）の取り合いで勝負する、オリジナルの対戦カードゲーム「結晶オーバードライブ」（仮）。
まずWeb版で遊びを固め、その後iOSアプリへ展開します。

## 特徴
- 結晶は「手元」「熱い→冷めた（2ターンかけて冷却）」「ユニットの上」の3か所を巡る
- 上限を超えて結晶を乗せる「オーバードライブ」で、リスクと引き換えに大きく強化
- 削られたライフ結晶は中央プールへ。劣勢の側が毎ターン拾える

ルールとカード一覧は [docs/rules.md](docs/rules.md) を参照してください。

Web版の対戦画面では「カード」ボタンから全12種の効果を確認できます。

## フォルダ構成
| パス | 内容 |
|---|---|
| `web/` | Web版（HTML / CSS / カード定義 / 対戦処理 / UI） |
| `docs/` | ルール・カード一覧 |
| `ios/` | アプリ版（移行時に追加予定） |

## ブランチ運用
| ブランチ | 用途 |
|---|---|
| `main` | 本番。Web版の公開版 / アプリ版のリリース元 |
| `develop` | Web版の開発。区切りごとにPRで `main` へ |
| `feature/*` | 大きめの変更用（例：`feature/more-cards`） |
| `ios` | アプリ化の作業用（開始時に作成） |

構成・読み込み順・iOS移行時の注意点は [docs/Web構成.md](docs/Web構成.md) を参照してください。

## ローカルで遊ぶ
`web/index.html` をブラウザで開くだけで動きます。

## iOSアプリの動作確認（Capacitor 8）
Web版をWKWebViewへ同梱する設定を追加しています。Mac（Xcode 26以降、Node.js 22以降）で次を実行します。

```sh
npm install
npm test
npm run ios:add     # 初回のみ
npm run ios:sync
npm run ios:open
```

Xcodeの実行先にiPhoneシミュレーターを選んでRunしてください。
詳しい実機手順は [docs/iOS起動手順.md](docs/iOS起動手順.md) を参照してください。
生成されたネイティブ `ios/` プロジェクトと `package-lock.json` は次のPRでGit管理します。

## 自動テスト
Node.js 22以上で、追加パッケージなしで実行できます。

```sh
node --test tests/*.test.cjs
```

検証範囲とiPhone実機確認項目は [docs/テスト方針.md](docs/テスト方針.md) を参照してください。

## バランス候補の比較
本番ルールは変更せず、ライフ・初期結晶・OD反動の候補を固定シードで比較します。

```sh
node scripts/balance-scenarios.cjs --games 100 --seed 20261031
```

比較方法と注意点は [docs/バランス比較.md](docs/バランス比較.md) を参照してください。
