# QA・引き継ぎ

更新: 2026-11-15 JST。M1作業中、PR #10 Draft、マージ/公開不可。

## 開始時調査
- 新規cloneのため未コミットユーザー変更なし。作業ブランチ `feature/ios-formal-battle-ui-20261109`、開始SHA `23b32eac`。
- main `c0fca5b`、develop `1ceee7d`、developのみ9コミット。未完了PRは #9（独立試作）と #10（正式UI）。
- 開始時最新CI [43701388920](https://github.com/nova-xx-zz/crystal-overdrive/actions/runs/43701388920) 成功。Node回帰48件成功。
- README、docs、カード/ルール、game/ui、CSS3層、tests、CI、Capacitor/向きスクリプトを確認。

## 再現したUI問題
- 10枚手札: 扇形の角度が枚数に比例して拡大。390×844で先頭カード左端 -50px、568×320で末尾が下端337pxになり画面外。スクロール先頭でもコスト/名前が切れる。
- 攻撃フェイズボタンの表示高さが約24px、設定は37〜40px。通常操作44pxを満たさない。
- ターン終了が絶対配置で中央プールを覆う。横持ちは43pxの中央行に実内容が約68pxありユニット列へ侵入。
- 先攻1ターン目の攻撃不可メッセージは `S.hint` にあるが、詳細を開かない通常画面で見えない。
- 描画ごとに手札DOMを再作成するため、横スクロール位置を失う。

## 技術的負債・未確認
3層CSSの旧プロパティ（特にgrid/padding/min-height）が正式UIに継承される。静的なCSS文字列検査は重なりを検出できない。game.jsは描画/Promise/UI状態と結合。固定デッキのみで保存/収集はない。iOSネイティブプロジェクトとlockfileは開始時存在しない。

実装後の検証結果・スクリーンショット・次の作業は本ファイルへ追記する。実機/Simulator/Xcode、Apple署名/Archive、TestFlightは未実施。

## 今回の実装
- 操作ボタンを盤面中央の通常フローへ移し、中央プール/ユニット/HUDとの競合を解消。設定・主要操作は44px以上。
- 1〜4枚の手札は小さい扇形、5枚以上は横スクロール。カード上下の余白を確保し、詳細開閉やCPU描画でスクロールを維持。新しい対戦では先頭へ戻す。
- 先攻の攻撃制約と進行案内を画面に表示。召喚/結晶変化/ODの演出をUIの差分から生成し、判定は変更しない。動きを減らす設定に対応。
- iOS 15初期版の互換性のため、UIの `Array.at` 依存を除去し、`100dvh` 非対応時の `100vh` フォールバックを追加。
- Node/Capacitor/Playwrightの再現可能なlockfile、ローカルサーバー、Chromium/WebKitのCIとレポート保存を追加。
- AGENTSと指定のロードマップ/設計/QA/チェックリストを整備。既存PR #10を継承し、カード/ルール/CPUのロジックに変更なし。

## 今回の検証
| 検証 | 結果・制約 |
|---|---|
| `npm test` | 51件成功（既存48＋UI演出/案内/初期iOS互換性3） |
| `npm run test:ui -- --project=chromium` | 12件成功。8サイズ×5手札枚数、端カード44px/ヒット、詳細/一覧/設定、スクロール保持、対象/OD/ブロック、UI通し対戦/再戦、回転/余白 |
| `npm run test:ui -- --project=webkit` | 12件成功。Chromiumと同じケース。Linux WebKit 26.5、iOS実機とは別環境 |
| `node scripts/balance-report.cjs --games 100 --seed 20261031` | 200試合、未決着0。rush 79勝/21敗・平均3.17、reserve 54勝/46敗・平均3.82。既存基準と一致 |
| `node scripts/balance-scenarios.cjs --games 100 --seed 20261031` | 7条件×2方針×100試合（1400試合）の比較を実行。ルール値は採用/変更していない |
| `npm audit --json` | 既知の報告脆弱性0件（この時点のレジストリ）。完全な安全性保証ではない |
| 描画コスト | ローカルChromium、390×844、8体＋手札10枚、100回の再描画/レイアウト中央値8.1ms、p95 12.1ms。仮想Linuxの参考値であり実機性能ではない |
| 差分レビュー | セルフレビューと独立した読み取り専用レビューを実施。端カードの入力検査/各サイズの詳細・一覧操作を補強 |
| iOS Simulator/Xcode/実機 | 未実施。LinuxにXcodeがないためビルド成功やTestFlight準備完了とは扱わない |

ブラウザはPlaywright 1.62.1のChromium 151とWebKit 26.5。Linuxの不足ライブラリは作業ディレクトリへ展開した。WebKitのローカル実行のみ、システムのldconfigに展開先を登録できないため依存事前検査を省略し、ブラウザの実起動/操作を検証する。CIでは通常の `playwright install --with-deps` と事前検査を使用する。

## スクリーンショット比較
同じ描画フィクスチャ（双方4体、手札10枚、390×844 / 568×320）で取得。ルールの合法手順を再現した試合記録ではなく、表示負荷の比較。新しいブラウザテストの画面/失敗トレースはCI artifact `battle-ui-report` へ保存。

| 表示 | 修正前 | 修正後 |
|---|---|---|
| 縦 | [before-390x844](qa/before-390x844.png) | [after-390x844](qa/after-390x844.png) |
| 小さい横 | [before-568x320](qa/before-568x320.png) | [after-568x320](qa/after-568x320.png) |

## 次の作業と実機手順
次はM1のデッキ検証/複数保存/編集/選択デッキ対戦を別featureで実装する。UIの実機待ちと独立して進められる。設計は [deck-system.md](deck-system.md)。その後タイトル、チュートリアル、CPU難易度、効果音/設定、iOSネイティブ整備。

Mac:
```sh
git fetch origin
git switch feature/ios-formal-battle-ui-20261109
git pull --ff-only
npm ci
npm test
npm run ios:add       # ios/App/App.xcodeproj がない初回のみ
npm run ios:prepare
npm run ios:open
```

XcodeでSimulator/実機の縦横を確認。手札を末尾までスワイプ→詳細を閉じる→召喚、結晶の増減→OD、攻撃→ブロック→勝敗→再戦。先攻1ターン目の案内、ノッチ/ホームバー、回転中の見切れ、VoiceOver、復帰後の操作、端末の発熱を確認し、機種/OS/向きと再現手順・画面を追記する。必須の実機ゲート解消までDraftを維持。
