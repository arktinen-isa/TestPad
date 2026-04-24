#!/bin/sh

# Inject connection_limit=1 for the Schema Engine so migrations don't exhaust
# the shared MySQL per-user connection cap. The app client uses its own limit
# set in src/lib/prisma.ts.
if echo "$DATABASE_URL" | grep -q '?'; then
  MIGRATION_URL="${DATABASE_URL}&connection_limit=1&pool_timeout=30"
else
  MIGRATION_URL="${DATABASE_URL}?connection_limit=1&pool_timeout=30"
fi

run_migration() {
  DATABASE_URL="$MIGRATION_URL" node_modules/.bin/prisma db push --accept-data-loss
}

MAX_ATTEMPTS=5
WAIT=15
ATTEMPT=1

until run_migration; do
  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
    echo "Migration failed after $MAX_ATTEMPTS attempts. Giving up."
    exit 1
  fi
  echo "Migration attempt $ATTEMPT failed — waiting ${WAIT}s for stale connections to drain..."
  sleep "$WAIT"
  WAIT=$((WAIT * 2))
  ATTEMPT=$((ATTEMPT + 1))
done

node dist/seed.js
exec node dist/index.js
