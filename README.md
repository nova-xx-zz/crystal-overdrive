# crystal-overdrive

結晶（クリスタル）の取り合いで勝負する、オリジナルの対戦カードゲーム「結晶オーバードライブ」（仮）。
まずWeb版で遊びを固め、その後iOSアプリへ展開します。

## 特徴
- 結晶は「手元」「熱い→冷めた（2ターンかけて冷却）」「ユニットの上」の3か所を巡る
- 上限を超えて結晶を乗せる「オーバードライブ」で、リスクと引き換えに大きく強化
- 削られたライフ結晶は中央プールへ。劣勢の側が毎ターン拾える

ルールとカード一覧は [docs/rules.md](docs/rules.md) を参照してください。

Web版の対戦画面では「カード」ボタンから全12種の効果を確認できます。

**iOS正式バトル画面**: 俯瞰視点の石造アリーナ、相手／自分のフィールド、扇形手札を縦持ち・横持ちで表示するUIを `web/index.html` に実装しています。見た目は `web/arena-battle.css`、対戦・入力は既存の `web/game.js` / `web/ui.js` に分かれています。設計・ルールとの差異・実機検証項目は [docs/iOS縦横バトルUI.md](docs/iOS縦横バトルUI.md) を参照してください。

製品化は [M1〜M5ロードマップ](docs/release-roadmap.md) に従います。現在は **M1のUI改善中・実機確認待ち** です。タイトル、デッキ構築、保存、無料ガチャ、オンライン、ランキングはまだ実装していません。引き継ぎは [AGENTS.md](AGENTS.md)、[アーキテクチャ](docs/architecture.md)、[QA結果・次の作業](docs/qa-report.md)、[リリース確認表](docs/release-checklist.md) を参照してください。

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

構成・読み込み順・iOS移行時の注意点は [docs/Web構成.md](docs/Web構成.md) を参照してください。

## ローカルで遊ぶ
`web/index.html` をブラウザで開くだけで動きます。

## iOSアプリの動作確認（Capacitor 8）
Web版をWKWebViewへ同梱する設定を追加しています。Mac（Xcode 26以降、Node.js 22以降）で次を実行します。

```sh
npm ci
npm test
npm run ios:add     # 初回のみ
npm run ios:prepare # iOS同梱＋縦横の回転許可
npm run ios:open
```

Xcodeの実行先にiPhoneシミュレーターを選んでRunしてください。
詳しい実機手順は [docs/iOS起動手順.md](docs/iOS起動手順.md) を参照してください。
`package-lock.json` はGit管理しています。ネイティブ `ios/` プロジェクトの生成・Git管理、Xcodeビルド、署名とTestFlight準備は未完了です。

## 自動テスト
Node.js 22以上で、追加パッケージなしで実行できます。

```sh
node --test tests/*.test.cjs
```

検証範囲とiPhone実機確認項目は [docs/テスト方針.md](docs/テスト方針.md) を参照してください。

ブラウザの実レンダリング・操作テスト（Chromium / WebKit）:

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run test:ui
```

8画面サイズで満員盤面と0/1/4/10/20枚の手札、44px以上の主要入力、ヒットテスト、手札スクロール維持、対象指定、ブロック、CPU戦の勝敗/再戦を確認します。スクリーンショット・失敗時トレースはCIの `battle-ui-report` に保存します。ローカル確認は `npm run dev` → `http://127.0.0.1:4173`。LinuxのWebKitテストはiOS実機テストの代わりにはなりません。

`chromium-touch` の3ケースではブラウザのタッチ入力によるスワイプも確認します。手札がすべて収まるときは動かなくて正常です。実機では縦持ちで手札を5枚以上にし、横にはみ出した状態で左右の移動・端カードの詳細表示を確認してください。

## バランス候補の比較
本番ルールは変更せず、ライフ・初期結晶・OD反動の候補を固定シードで比較します。

```sh
node scripts/balance-scenarios.cjs --games 100 --seed 20261031
```

比較方法と注意点は [docs/バランス比較.md](docs/バランス比較.md) を参照してください。
