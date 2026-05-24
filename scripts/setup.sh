#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Use project-local Node if present (created by portable install)
if [ -x ".tools/node/bin/npm" ]; then
  export PATH="$PWD/.tools/node/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install from https://nodejs.org/ (LTS 20+) or run:"
  echo "  curl -fsSL https://nodejs.org/dist/v22.15.0/node-v22.15.0-darwin-$(uname -m | sed 's/x86_64/x64/').tar.gz | tar -xz -C .tools --strip-components=1"
  exit 1
fi

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local — fill in Supabase and integration keys."
fi

npm install
echo ""
echo "Next steps:"
echo "  1. Run supabase/migrations/001_initial_schema.sql in Supabase SQL Editor"
echo "  2. Edit .env.local with your project URL and keys"
echo "  3. npm run dev"
echo "  4. Push to GitHub and import repo in Vercel"
