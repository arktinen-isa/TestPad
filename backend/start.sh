#!/bin/sh
set -e

# Inject connection_limit=1 for the Schema Engine so migrations don't exhaust
# the shared MySQL host's per-user connection cap (currently 50).
if echo "$DATABASE_URL" | grep -q '?'; then
  MIGRATION_URL="${DATABASE_URL}&connection_limit=1&pool_timeout=30"
else
  MIGRATION_URL="${DATABASE_URL}?connection_limit=1&pool_timeout=30"
fi

DATABASE_URL="$MIGRATION_URL" node_modules/.bin/prisma db push --accept-data-loss
node dist/seed.js
exec node dist/index.js
