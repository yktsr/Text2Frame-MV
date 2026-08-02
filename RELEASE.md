# リリース手順

このリポジトリは **3つの別々の成果物**を出しています。バージョンも配布先も独立しているので、
どれを出すのかを最初に決めてください。

| 成果物 | 中身 | 配布先 | バージョン |
| --- | --- | --- | --- |
| ツクール用プラグイン | `Text2Frame.js` / `Frame2Text.js` の生ファイル | GitHub Releases | `package.json` の `version`（例 `2.3.0`）|
| npm パッケージ | CLI（`text2frame` / `frame2text` / `t2f-sync`）とライブラリ | npm `@yktsr/text2frame-mv` | 同上 |
| VS Code 拡張 | `vscode-extension/` | VS Code Marketplace | `vscode-extension/package.json` の `version`（例 `0.1.1`）|

プラグインと npm パッケージは同じ `package.json` の版番号を共有します。**npm パッケージ＝
プラグインファイルではありません**（利用者にとっては別チャネルです）。

---

## まとめて作る

3つ全部を作るなら [tools/pack-all.sh](tools/pack-all.sh) が一度でやります。**公開はしません**。
`release/` に成果物を並べ、中身の検証結果を出すところまでです。

```bash
npm run pack:all
```

```
release/
  Text2Frame.js                              ← GitHub Releases に添付する生ファイル
  Frame2Text.js
  yktsr-text2frame-mv-2.3.0.tgz              ← npm publish するもの / ローカル検証にも使う
  text2frame-language-support-0.1.1.vsix     ← vsce publish するもの
```

やること:

- lint とテスト（コア＋拡張）を通す
- ルートの cjs/es/umd バンドルを作り直す（B-1 の忘れやすいやつ）。差分が出たらコミットを促す
- `npm pack` と `vsce package`
- **同梱コンパイラがリポジトリの `Text2Frame.js` / `Frame2Text.js` と一致するか**を `.vsix` を
  開いて突き合わせる（ここがずれると、本体を直したのに拡張だけ古い挙動になる）
- 拡張の pre-release / 安定版はマイナー版の偶奇から判定（`--stable` / `--pre-release` で上書き）

```bash
npm run pack:all -- --skip-tests     # 検査を飛ばす(中身だけ見たいとき)
npm run pack:all -- --stable         # 拡張を安定版として作る
npm run pack:all -- --out /tmp/rel   # 出力先を変える
```

以下は、個別にやる場合と背景の説明です。

## 0. 共通の事前チェック

リポジトリルートで:

```bash
npm ci
npm run lint
npm test
npm run test_frame2text
npm run audit:prod
```

拡張も出すなら:

```bash
cd vscode-extension && npm ci && npm run compile && npm run lint
```

CI（[.github/workflows/nodejs.yml](.github/workflows/nodejs.yml)）が push / PR で同じことを
回しています。ローカルで落ちるものは CI でも落ちます。

---

## A. ツクール用プラグイン（GitHub Releases）

利用者は `js/plugins/` に置く生の `.js` を1枚ダウンロードします。ビルド成果物ではなく
**リポジトリルートの生ファイルそのもの**が配布物です。

1. `Text2Frame.js` / `Frame2Text.js` の `@help` 内 Version 節と、ファイル冒頭の
   `// Version` コメントに変更履歴を追記する。
2. `package.json` の `version` を上げる。
3. [README.md](README.md) のダウンロードバッジ（先頭付近）のリンク先バージョンを差し替える。
   `https://github.com/yktsr/Text2Frame-MV/releases/download/<version>/Text2Frame.js`
4. コミットしてタグを打つ。既存のタグはバージョンそのまま（`2.2.4` など）:
   ```bash
   git tag 2.3.0
   git push origin 2.3.0
   ```
5. GitHub Releases を作成し、`Text2Frame.js` と `Frame2Text.js` を添付する。
   バッジのリンクはこの添付ファイルを指しています。

> 注意: バッジのリンク先タグと実際のタグがずれると、README の Download が 404 になります。
> 現時点で README は `2.3.0` を指していますが、`2.3.0` タグはまだありません。

---

## B. npm パッケージ

### B-1. バンドルを作り直す（忘れやすい）

`npm run build`（rollup）は **`dist/` に出力します**が、公開されるのは `package.json` の
`files` に並んだ**ルートの** `Text2Frame.cjs.js` / `Text2Frame.es.mjs` / `Text2Frame.umd.js`
です。この3つは git 管理下のコミット済み成果物で、**自動では更新されません**。

```bash
npm run build:dist                 # rollup + ビルドメタの刻印(dist/ へ)
cp dist/Text2Frame.es.mjs dist/Text2Frame.cjs.js dist/Text2Frame.umd.js .
git add Text2Frame.es.mjs Text2Frame.cjs.js Text2Frame.umd.js
```

更新できているかは、直近で足した識別子を探すのが早いです:

```bash
grep -c buildPullText Text2Frame.cjs.js     # 0 なら古い
```

`main` は生の `Text2Frame.js` なので `require('@yktsr/text2frame-mv')` は影響を受けません。
古くなるのは `.cjs.js` / `.es.mjs` / `.umd.js` を直接読む利用者だけです。

### B-2. 中身を確認する

```bash
npm publish --dry-run
```

12ファイル・約2.9MB が出れば想定どおりです。`files` に無いものは入りません
（`test/`、`tools/`、`vscode-extension/`、`dist/` は対象外）。

### B-3. 公開

```bash
npm publish        # publishConfig.access = public 済み
```

---

## C. VS Code 拡張

すべて **`vscode-extension/` で**実行します。Node は **v20 系**（`vsce` 3.x が Node >= 20 必須）。

```bash
cd vscode-extension
```

### C-0. 前提（初回のみ）

- Marketplace の publisher を作成済み: https://marketplace.visualstudio.com/manage
- Azure DevOps の Personal Access Token（scope = **Marketplace > Manage**）
- `package.json` の `publisher` が登録済み publisher ID と一致していること
- （任意）Open VSX で出すならそのアカウントとトークン

### C-1. バージョンと種別

VS Code の慣例で **奇数マイナーが pre-release、偶数マイナーが安定版**です。

| 種別 | 例 | フラグ |
| --- | --- | --- |
| pre-release | `0.1.0`, `0.1.1` | `--pre-release` |
| 安定版 | `0.2.0` | （なし） |

`package.json` の `version` を上げ、[CHANGELOG.md](vscode-extension/CHANGELOG.md) に追記します。

### C-2. パッケージング

`vsce package` が `vscode:prepublish`（`npm run compile` + `npm run bundle-compiler`）を
自動で回し、**そのときのルートの `Text2Frame.js` / `Frame2Text.js` を `lib/` に取り込みます**。
拡張はこの同梱コピーで動くので、**プラグイン本体を直したら拡張も出し直す必要があります**。

```bash
npx @vscode/vsce package --pre-release      # 安定版はフラグ無し
# → text2frame-language-support-<version>.vsix
```

同梱コンパイラが最新か:

```bash
unzip -p text2frame-language-support-*.vsix extension/lib/Frame2Text.js | grep -c buildPullText
```

### C-3. 公開

```bash
# 生成済みの .vsix をそのまま出す(pre-release フラグは .vsix に内包済み)
npx @vscode/vsce publish --packagePath text2frame-language-support-<version>.vsix -p <PAT>

# 対話ログインしておく場合
npx @vscode/vsce login <publisher>
npx @vscode/vsce publish --pre-release

# Open VSX(任意)
npx ovsx publish text2frame-language-support-<version>.vsix -p <OPENVSX_TOKEN>
```

`.vsix` は成果物なのでコミット不要です。`package.json` と `CHANGELOG.md` をコミットして
タグを打ちます（プラグイン側のタグと混ざらないよう接頭辞を付けます）:

```bash
git commit -m "chore(vscode): release v<version> (pre-release)"
git tag vscode-v<version>
```

---

## D. ローカルでの動作確認（npx）

公開前に、**利用者と同じ入り口**で触るための手順です。3通りあります。

### D-1. tarball を作って別プロジェクトへ入れる（本番に一番近い）

`files` の絞り込みまで含めて本番と同じものを検証できます。**公開前はこれを推奨**します。

```bash
# リポジトリルートで tarball を作る
npm pack --pack-destination /tmp/t2f-check
# → yktsr-text2frame-mv-<version>.tgz

# 使う側のプロジェクトを用意して入れる
mkdir -p /tmp/t2f-check/proj && cd /tmp/t2f-check/proj
npm init -y
npm install ../yktsr-text2frame-mv-<version>.tgz
```

`node_modules/.bin/` に `text2frame` / `frame2text` / `t2f-sync` の3つが並べば成功です。
あとは `data/Map001.json` と `data/CommonEvents.json` のあるプロジェクトで:

```bash
npx frame2text --mode batch --data-dir data --text-dir text --locale ja   # 取り出し
npx text2frame --mode batch --text-dir text                               # 反映
npx t2f-sync --help                                                       # 双方向同期
```

`frame2text` / `text2frame` は結果を JSON で標準出力に出します。`"failed": 0` と、
`text/ja/` にファイルが出ていることを確認してください。

### D-2. インストールせずに tarball から直接動かす（手早い確認）

CLI のヘルプや1コマンドだけ見たいときはこれで十分です。

```bash
npx -y -p /tmp/t2f-check/yktsr-text2frame-mv-<version>.tgz frame2text --help
```

### D-3. 作業ツリーへ symlink する（開発中のループ）

`npm link` は作業ツリーへの symlink なので、**ソースを直すとそのまま反映されます**。
`npm pack` をやり直す必要がありません。ただし `files` の絞り込みは効かないので、
「公開物に入っているか」の確認には使えません。

```bash
cd /tmp/t2f-check/proj
npm link /path/to/Text2Frame-MV
npx t2f-sync --help
```

### D-4. VS Code 拡張

`.vsix` を実 VS Code に入れて確認します（`code` コマンドが必要）。

```bash
code --install-extension text2frame-language-support-<version>.vsix
```

見るところ:

- 翻訳セット作成 → 編集 → 翻訳デプロイ
- 反映の差分警告が「Block changed / Block removed」を出し分けている
- 取り出し（統合）で、目印が残っているときに見送りの案内が出る
- 衝突が残っているあいだ `.t2f-base` が進んでいない
- シンタックスハイライトと補完

### D-5. ゲーム内（プラグインとして）

CLI では通らない経路（NW.js、`$gameMessage` への出力、プラグインコマンドの引数順）は
実プロジェクトでしか確認できません。`js/plugins/` に `Text2Frame.js` / `Frame2Text.js` を
置いて、少なくとも次を通してください。

- `BATCH_EXPORT_MESSAGES_TO_FOLDER`（第1引数が取り出しのしかた）
- `BATCH_IMPORT_MESSAGES_FROM_FOLDER`（第1引数が反映のしかた）
- 反映後に「セーブせずに開き直してください」が**1回だけ**出ること

---

## チェックリスト

共通:

- [ ] `npm run lint` / `npm test` / `npm run test_frame2text` / `npm run audit:prod` がクリーン
- [ ] 変更履歴を追記した（プラグインは `@help` の Version 節、拡張は `CHANGELOG.md`）

プラグイン:

- [ ] `package.json` の `version` を更新
- [ ] README のダウンロードバッジのバージョンを更新
- [ ] タグを打ち、Release に `Text2Frame.js` / `Frame2Text.js` を添付

npm:

- [ ] ルートの `Text2Frame.cjs.js` / `.es.mjs` / `.umd.js` を作り直してコミット
- [ ] `npm publish --dry-run` の中身を確認
- [ ] tarball を別プロジェクトへ入れて3つの CLI を実行（D-1）

VS Code 拡張:

- [ ] `version` を更新（pre-release は奇数マイナー）
- [ ] `publisher` が登録済み ID と一致
- [ ] `icon.png`（128x128）がある
- [ ] `engines.vscode` の範囲が妥当
- [ ] 同梱 `lib/` が最新のプラグイン本体になっている
- [ ] ローカル `.vsix` で動作確認済み（D-4）
