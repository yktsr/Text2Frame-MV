# AGENTS.md

RPGツクール MV/MZ のイベントとテキストを相互変換するプラグイン。前面が5つ(ツクールの
プラグインコマンド・CLI 2本・`t2f-sync.js`・VS Code 拡張・MCP サーバ)あり、どれも同じ公開 API を通る。

**設計書は [.github/agents/project-context.agent.md](.github/agents/project-context.agent.md)。**
公開 API・データフロー・落とし穴・**どの記述が検査で守られていてどれが手書きか**は、そこに書いてある。
計画を立てる前に読む。

## 作業の約束

- **`git add -A` / `git add .` は使わない。** 作業ツリーに巨大な未追跡のゲームプロジェクトがある。
  毎回パスを明示してステージする。
- **push・PR の作成・issue への投稿は、言われてから。** 下書きは渡すだけ。
- コミットメッセージには**利用者にとって何が変わるか**を書く。仕組みの説明は書かない。
- 日本語で答える。コードのコメントは日本語で**理由**を書く(仕組みは読めば分かる)。
  テスト名は英語、テストのコメントは日本語。

## 触らないもの

- **`@help`(プラグインのヘルプ文)・更新履歴・`CHANGELOG.md`** ── 版を切るときに作者が書く。
  矛盾を見つけたら直さずに教える。
- **`.gitignore`・トップの `README.md`** ── 未コミットの変更がある。
- **`vscode-extension/src/db/*`** ── 借りている層。MCP も同じものを読む。持ち主は拡張。

## いちばん踏む穴: `gameRoot`

`compile` / `decompile` / `buildPullText` / `applyTextFile` は `opts.gameRoot` をもらったときだけ、
そのゲームの `js/plugins.js` にある設定(`Default Background` / `Default Window Position` /
`Comment Out Char`)に入れ替えて、その呼び出しの間だけ使い、`finally` で戻す。
**渡さなければ出荷時の既定のまま** ── 既定を「透明」にしているプロジェクトは**全部「ウィンドウ」に倒れ**、
`Comment Out Char` を変えているプロジェクトでは**コメント行が本文として反映される**。

渡し忘れの方向が「今までどおりの既定に落ちる」なので、**テストも往復検査も気づかない。**
**行や既定を読む新しい処理を足すときは、まず `gameRoot` を受ける。**

## ゲームの中でも走る

`Text2Frame.js` の IIFE は、プラグインとして読まれた瞬間に直書きの行を全部実行する。だから:

- **`require` は全部関数の中に書く。** モジュールの直書きで `require('crypto')` などを読むと、
  ブラウザに配ったゲームが**起動時に落ちる**(`require` が無い)。
- **グローバルに置けるのは `$LaurusText2Frame` と `$LaurusFrame2Text` の2つだけ。**
  貸したいものは列挙しない窓(`_internal` / `_csv`)に入れる ── 公開 API を1つ増やすと
  `test/test_examples.js` の一覧・`examples/` の2枚・`esm.d.ts` が動く。

番人は `test/test_browser_load.js`(`require` も `process` も無い `vm` の入れ物で実際に読み込む)。

## 検証

```bash
npm run lint && npm test
node tools/snapshot-text.js --check && npm run check-params
node tools/snapshot-mcp.js --check && node tools/snapshot-csv.js --check
cd vscode-extension && npm run compile && npm run lint && npm test
```

Frame2Text の出力を変えたら実データ往復も見る。**`tools/verify-roundtrip.js` は書き換えるので
データの写しに対して**、そして**落とし先を渡さないとリポジトリにテキストが生まれる**(実際に
未追跡の2,903件を作った)。打ち方は設計書の「開発コマンド」に1か所だけ置いてある。

**実機(RPGツクールの画面)での確認は作者の仕事。** 本物のゲームプロジェクトは読むだけで、
書き込みは必ず写しに対して。

## 文書を一緒に直す

設計書で検査が守っているのは、公開している関数の**名前**まで。**関数の options の一覧と件数は
手書きで、守る検査が無い** ── 最近の修正はほぼ全部そこに入った(どれが守られているかの表は
設計書の最後の節)。

だから **オプションを1つ足したら、設計書の該当行も同じコミットで直す。**
直し忘れは、次に計画を立てる人の時間で払うことになる。
