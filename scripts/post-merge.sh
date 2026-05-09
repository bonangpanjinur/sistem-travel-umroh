#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Only push DB schema if there are actual table definitions
SCHEMA_FILE="lib/db/src/schema/index.ts"
if grep -q "pgTable\|mysqlTable\|sqliteTable" "$SCHEMA_FILE" 2>/dev/null; then
  echo "Schema definitions found — pushing to database..."
  pnpm --filter db push
else
  echo "No table definitions in schema — skipping db push."
fi
