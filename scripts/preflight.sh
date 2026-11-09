#!/usr/bin/env bash
# Preflight for deploying rxwsxn.com to Cloudflare Pages.
# Runs every check that has bitten this project before, and stops on the first
# failure with something you can act on.
#
#   ./scripts/preflight.sh          # full: install, build, verify
#   ./scripts/preflight.sh --fast   # skip npm install

set -euo pipefail
cd "$(dirname "$0")/.."

red()   { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
dim()   { printf '\033[2m%s\033[0m\n' "$1"; }

fail() { red "✗ $1"; exit 1; }
ok()   { green "✓ $1"; }

# ---------------------------------------------------------------- node
NODE_MAJOR=$(node -v | sed 's/^v\([0-9]*\).*/\1/')
[ "$NODE_MAJOR" -ge 20 ] || fail "node $(node -v) — Astro 5 needs 20+. Run: nvm use"
ok "node $(node -v)"

# ---------------------------------------------------------------- install
if [ "${1:-}" != "--fast" ]; then
  dim "installing dependencies…"
  npm ci --no-audit --no-fund >/dev/null 2>&1 || npm install --no-audit --no-fund >/dev/null
  ok "dependencies installed"
fi

# ---------------------------------------------------------------- build
dim "building…"
if ! npm run build >/tmp/rxwsxn-build.log 2>&1; then
  red "✗ build failed — last 20 lines:"
  tail -20 /tmp/rxwsxn-build.log
  exit 1
fi
ok "build passed"

# ---------------------------------------------------------------- output
[ -f dist/index.html ] || fail "dist/index.html missing — check the build output directory"
ok "dist/index.html"

for page in work blog links studio 404.html; do
  if [ -e "dist/${page}" ] || [ -e "dist/${page}/index.html" ]; then
    ok "route /${page}"
  else
    dim "· /${page} not in dist (fine if you removed it)"
  fi
done

# ---------------------------------------------------------------- functions
missing=0
for fn in links publish posts upload preview; do
  [ -f "functions/api/${fn}.js" ] || { red "✗ functions/api/${fn}.js missing"; missing=1; }
done
[ "$missing" -eq 0 ] && ok "functions/api — 5 endpoints"

# ---------------------------------------------------------------- secrets reminder
cat <<'EOF'

Before you deploy, the Pages project needs these (Settings → Environment variables,
Production AND Preview):

  NODE_VERSION   20
  LINKS_TOKEN    for /links/edit
  STUDIO_TOKEN   for /studio
  GITHUB_TOKEN   fine-grained PAT, Contents: read and write
  GITHUB_REPO    rxwsxn/rxwsxn.com
  GITHUB_BRANCH  main            (optional)

And one KV namespace binding (Settings → Functions → KV namespace bindings):

  LINKS  →  your links namespace

Then:

  npx wrangler pages deploy dist --project-name rxwsxn-com

or push to main if the project is connected to Git.

EOF
green "preflight complete"
