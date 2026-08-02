#!/usr/bin/env bash
# 3つの成果物(ツクール用プラグイン / npm パッケージ / VS Code 拡張)を1つの出力先へまとめて作る。
# 公開はしない。作ったものを release/ に並べて、中身の検証結果を出すところまで。
# 手順の背景は RELEASE.md を参照。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="$ROOT/release"
RUN_TESTS=1
EXT_CHANNEL=auto

usage () {
  cat <<'EOS'
usage: tools/pack-all.sh [options]

  --out DIR       出力先 (既定: release/)
  --skip-tests    lint とテストを飛ばす (中身の確認だけしたいとき)
  --stable        VS Code 拡張を安定版として作る (既定はマイナー版の偶奇から判定)
  --pre-release   VS Code 拡張を pre-release として作る
  -h, --help      これ
EOS
}

while [ $# -gt 0 ]; do
  case "$1" in
    --out) OUT="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"; shift 2 ;;
    --skip-tests) RUN_TESTS=0; shift ;;
    --stable) EXT_CHANNEL=stable; shift ;;
    --pre-release) EXT_CHANNEL=pre; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

step () { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
fail () { printf '\033[31mNG\033[0m %s\n' "$1"; exit 1; }
ok   () { printf '\033[32mOK\033[0m %s\n' "$1"; }

PKG_VERSION="$(node -p "require('$ROOT/package.json').version")"
EXT_VERSION="$(node -p "require('$ROOT/vscode-extension/package.json').version")"

# vsce 3.x は Node >= 20。ここで落としておかないとパッケージングの最後で転ぶ。
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || fail "Node >= 20 が必要です (現在 v$(node -p 'process.versions.node'))。vsce 3.x の要件です。"

step "対象"
echo "  プラグイン / npm : $PKG_VERSION"
echo "  VS Code 拡張     : $EXT_VERSION"
echo "  出力先           : $OUT"

if [ "$RUN_TESTS" -eq 1 ]; then
  step "検査 (lint + テスト)"
  npm run lint
  npm test
  npm run test_frame2text
  ( cd vscode-extension && npm run compile && npm run lint )
else
  step "検査 (--skip-tests のため飛ばしました)"
fi

rm -rf "$OUT"
mkdir -p "$OUT"

# --- 1. ツクール用プラグイン -------------------------------------------------
# 配布物はビルド成果物ではなくリポジトリの生ファイルそのもの。GitHub Releases に添付する。
step "1/3 ツクール用プラグイン"
cp Text2Frame.js Frame2Text.js "$OUT/"
ok "Text2Frame.js / Frame2Text.js"

# --- 2. npm パッケージ -------------------------------------------------------
# rollup は dist/ に出すが、公開されるのは package.json の files に並んだ「ルートの」
# バンドル。ここで作り直してからでないと古いものが同梱される (RELEASE.md B-1)。
step "2/3 npm パッケージ"
npm run build:dist
cp dist/Text2Frame.es.mjs dist/Text2Frame.cjs.js dist/Text2Frame.umd.js .
for f in Text2Frame.es.mjs Text2Frame.cjs.js Text2Frame.umd.js; do
  cmp -s "dist/$f" "$f" || fail "ルートの $f を更新できませんでした"
done
ok "ルートのバンドル3つを作り直しました"
BUNDLES_STALE=0
if ! git diff --quiet -- Text2Frame.es.mjs Text2Frame.cjs.js Text2Frame.umd.js; then
  BUNDLES_STALE=1
  printf '\033[33m!!\033[0m ルートのバンドルが更新されました。公開前にコミットしてください:\n'
  printf '   git add Text2Frame.es.mjs Text2Frame.cjs.js Text2Frame.umd.js\n'
fi
npm pack --pack-destination "$OUT" >/dev/null
TGZ="$OUT/yktsr-text2frame-mv-${PKG_VERSION}.tgz"
[ -f "$TGZ" ] || fail "tarball が見つかりません: $TGZ"
ok "$(basename "$TGZ") ($(tar tzf "$TGZ" | wc -l | tr -d ' ') ファイル)"

# --- 3. VS Code 拡張 ---------------------------------------------------------
# vsce package が vscode:prepublish 経由で lib/ にプラグイン本体を取り込む。
# 慣例: 奇数マイナー = pre-release / 偶数マイナー = 安定版。
step "3/3 VS Code 拡張"
if [ "$EXT_CHANNEL" = auto ]; then
  EXT_MINOR="$(node -p "require('$ROOT/vscode-extension/package.json').version.split('.')[1]")"
  if [ $((EXT_MINOR % 2)) -eq 1 ]; then EXT_CHANNEL=pre; else EXT_CHANNEL=stable; fi
  echo "  マイナー版 $EXT_MINOR から $EXT_CHANNEL と判定しました (--stable / --pre-release で上書きできます)"
fi
VSIX="$OUT/text2frame-language-support-${EXT_VERSION}.vsix"
VSCE_FLAGS=()
[ "$EXT_CHANNEL" = pre ] && VSCE_FLAGS+=(--pre-release)
( cd vscode-extension && npx --yes @vscode/vsce package "${VSCE_FLAGS[@]}" --out "$VSIX" )
[ -f "$VSIX" ] || fail "vsix が見つかりません: $VSIX"

# 同梱コンパイラが「いまのリポジトリの中身」と一致しているか。ここがずれると、
# プラグイン本体を直したのに拡張だけ古い挙動、という一番気づきにくい形で出る。
for f in Text2Frame.js Frame2Text.js; do
  unzip -p "$VSIX" "extension/lib/$f" | cmp -s - "$f" || fail "同梱の lib/$f がリポジトリの $f と一致しません"
done
ok "$(basename "$VSIX") ($EXT_CHANNEL / 同梱コンパイラはリポジトリと一致)"

# --- 一覧 --------------------------------------------------------------------
# 成果物の一覧を release/MANIFEST.txt に残す。手元でも CI でも同じものが出るので、
# GitHub Actions はこのディレクトリをそのまま artifact に上げれば済む。
step "一覧"
sha256 () {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}
MANIFEST="$OUT/MANIFEST.txt"
{
  echo "Text2Frame-MV release artifacts"
  echo "generated : $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "commit    : $(git rev-parse HEAD 2>/dev/null || echo 'n/a')"
  echo "branch    : $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'n/a')"
  echo "plugin/npm: $PKG_VERSION"
  echo "vscode ext: $EXT_VERSION ($EXT_CHANNEL)"
  echo
  printf '%10s  %-64s  %s\n' BYTES SHA256 FILE
  for f in "$OUT"/*; do
    [ "$f" = "$MANIFEST" ] && continue
    printf '%10s  %-64s  %s\n' "$(wc -c < "$f" | tr -d ' ')" "$(sha256 "$f")" "$(basename "$f")"
  done
  echo
  echo "checks"
  echo "  vsix bundled compiler == repo : OK"
  if [ "$BUNDLES_STALE" -eq 1 ]; then
    echo "  committed cjs/es/umd bundles  : STALE (作り直したものをコミットしてください)"
  else
    echo "  committed cjs/es/umd bundles  : OK"
  fi
} > "$MANIFEST"
cat "$MANIFEST"
cat <<EOS

公開はしていません。次にやることは RELEASE.md を参照:
  プラグイン  A. タグを打って Release に .js を2つ添付
  npm         B-3. npm publish
  VS Code     C-3. npx @vscode/vsce publish --packagePath <上の .vsix>
EOS
