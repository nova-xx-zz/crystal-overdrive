# iOS版をXcodeで確認する手順

## 目的と対象
Web版「結晶オーバードライブ」をCapacitor 8のWKWebViewに同梱して、iOSシミュレーターとiPhone実機で対戦の操作性を検証する。

**これはテスト用アプリの初期設定**。App Storeへの提出・課金・Apple Developer Programの登録はまだ行わない。
ゲームのロジック・カード設定はWeb版の `develop` と同じファイルを使う。

## 前提
- macOSとXcode 26以降（Capacitor 8はiOS 15以降をサポート）
- Xcode Command Line Tools / iOSシミュレーターのランタイム
- Node.js 22以上 / npm
- リポジトリ: `https://github.com/nova-xx-zz/crystal-overdrive.git`
- iPhone実機テスト時は端末接続・XcodeのSigning設定が必要。シミュレーターでは通常は署名不要

## 1. Macで最新コードを取得

```sh
git clone https://github.com/nova-xx-zz/crystal-overdrive.git
cd crystal-overdrive
git switch develop
git pull --ff-only origin develop

node -v
npm -v
xcodebuild -version
```

すでにclone済みなら、`git clone` は省いて既存フォルダに移動する。
`node` / `npm` が見つからない場合は、Node.js 22以上をインストールする（例: `brew install node`）。
`xcodebuild` が使えない場合は、Xcodeを起動して初期セットアップを完了し、必要なら `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` を指定する。

## 2. Capacitorの依存関係とiOSプロジェクトを作る

```sh
npm install
npm test
npm run ios:add
npm run ios:sync
npm run ios:open
```

- `ios:add` は**初回だけ**。すでに `ios/App/App.xcodeproj` があるなら実行しない。
- `ios:sync` は最新の `web/` の資材をネイティブアプリへコピーする。Webコードを更新した後は再実行する。
- `ios:open` は生成したiOSプロジェクトをXcodeで開く。
- 今回は `webDir: "web"` なのでWebのビルド工程は不要。HTML・CSS・JSをそのまま読み込む。
- `npm install` により生成される `package-lock.json` は今後の再現可能なビルドのため、ネイティブプロジェクトとともにGit管理する。

## 3. iOSシミュレーターでテスト
1. Xcodeの上部にある実行先を、インストール済みのiPhoneシミュレーターへ変更。
2. ▶（Run）を押す。
3. タイトル「結晶オーバードライブ」と対戦画面が表示されるかを確認。
4. 実行先にシミュレーターがない場合、Xcodeの「Settings → Components」などからiOS Simulator Runtimeをダウンロードする。メニュー表記はXcodeのバージョンで異なる。
5. `A build only device cannot be used to run this target` が出たら、実行先にGeneric iOS Deviceではなく具体的なiPhoneシミュレーターを選ぶ。

## 4. iPhone実機でテスト
1. iPhoneをMacへ接続し、必要に応じて接続とデバイス使用を許可する。
2. Xcodeでアプリのターゲットの「Signing & Capabilities」を開く。
3. `Automatically manage signing` を選び、自分のTeamを設定する。Personal Teamを利用できる構成では無料Apple IDでも実機テストができるが制限がある。
4. Bundle Identifierが重複して署名できない場合は、**本番公開前に確定予定の独自ID**へ変更する。`capacitor.config.json` の `appId` は仮設定 `com.novaxxzz.crystaloverdrive` であり、Appleの登録済みIDである保証はない。
5. Xcodeの実行先を接続したiPhoneに変更して▶（Run）を押す。必要ならiPhoneの開発者モードを有効にする。

## 5. 実機確認のチェックリスト
- [ ] 起動時に黒画面にならず、対戦画面が表示される
- [ ] CPUの盤面、中央プール、自分の盤面、手札、下部ボタンが表示される
- [ ] 手札のスワイプ・タップ・召喚、カード一覧、遊び方が動く
- [ ] 結晶操作、Lv2、OD、ターン終了が動く
- [ ] 攻撃とCPUからの攻撃に対するブロック選択ができる
- [ ] 勝利 / 敗北 / 「最初から」による再戦ができる
- [ ] ノッチ・ホームインジケーターでボタンが隠れない
- [ ] アプリを閉じて再起動した際、対戦状態が新規開始される（現行仕様）
- [ ] ネットワーク未接続でもゲームを起動して操作できる（Google Fontsはオフライン時にフォールバック）
- [ ] 横画面や文字拡大設定で重大な崩れがない

## GitHub運用
この準備PRは `feature/ios-capacitor-bootstrap` から `develop` へ統合する。
**Macで `npm run ios:add` を実行して生成した `ios/` ネイティブプロジェクトは、次の専用ブランチでレビューしコミットする。**
最初はビルドと実機動作を優先し、正式名称、アイコン、課金、プライバシー関連は次の公開準備フェーズで設定する。
`main` のWeb版にはまだ反映しない。

## トラブルシューティング
- `npm: command not found`：Node.js 22以上を導入し、ターミナルを再起動する。
- `Unable to find application named Simulator`：XcodeとiOS Simulator Runtimeがインストール済みか確認する。
- `No supported iOS devices`：Xcodeの実行先に具体的なシミュレーターまたは接続済みiPhoneを選ぶ。
- 白・黒画面： `npm run ios:sync` を再実行し、XcodeのConsole / Safari Web InspectorでJavaScriptエラーを確認する。
- Web版に新しいファイルを追加したら `web/` 内に配置し、相対パスで参照する。
- このアプリは現時点ではサーバー通信の設定を行わない。ゲーム処理は端末に同梱されたJavaScriptで動く。
