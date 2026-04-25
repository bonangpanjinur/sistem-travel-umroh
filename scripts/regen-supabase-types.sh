#!/usr/bin/env bash
# Regenerate src/integrations/supabase/types.ts from the live database schema.
#
# Lovable Cloud auto-syncs this file after each migration, so you normally do
# NOT need to run this manually. Use it only when working outside Lovable
# (e.g. local dev) and you want to refresh types without re-deploying.
#
# Usage:
#   PROJECT_REF=ribjppjnjigiowhjgngu ./scripts/regen-supabase-types.sh
#
# Requires: npx supabase CLI logged in (`supabase login`) with access to the project.

set -euo pipefail

PROJECT_REF="${PROJECT_REF:-ribjppjnjigiowhjgngu}"
OUT="src/integrations/supabase/types.ts"

echo "→ Regenerating $OUT from project $PROJECT_REF…"
npx supabase gen types typescript \
  --project-id "$PROJECT_REF" \
  --schema public \
  > "$OUT.tmp"

mv "$OUT.tmp" "$OUT"
echo "✓ Updated $OUT"
echo "  Run \`bunx tsc --noEmit\` to verify types compile."