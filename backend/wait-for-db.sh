#!/bin/sh
# Ждем, пока Postgres станет доступен
echo "⏳ Waiting for PostgreSQL to start..."
until nc -z db 5432; do
  sleep 1
done
echo "✅ PostgreSQL is up - starting app"
exec "$@"