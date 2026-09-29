#!/usr/bin/env node
'use strict'
// npm bin ラッパ。Frame2Text.js 本体は RPGツクールのプラグイン(<script>読込)も兼ねるため
// shebang を付けられない。ここから node で spawn し、本体を require.main として CLI 実行する。
const { spawnSync } = require('child_process')
const path = require('path')
const target = path.join(__dirname, '..', 'Frame2Text.js')
const r = spawnSync(process.execPath, [target].concat(process.argv.slice(2)), { stdio: 'inherit' })
process.exit(r.status == null ? 1 : r.status)
