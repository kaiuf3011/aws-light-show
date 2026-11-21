#!/usr/bin/env bash
# Rebuilds web/explain.js from explain/src.js (bundles three.js in, minified).
# Only needed if you change src.js; the built file is committed.
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules/three ] || npm install --no-save three@0.187.0 esbuild
npx esbuild src.js --bundle --format=esm --minify --target=es2020 --define:__TEMPLATE_LINES__="$(wc -l < ../template.yaml | tr -d " ")" --outfile=../web/explain.js
