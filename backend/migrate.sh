#!/bin/sh
# Запускати з папки backend/ після встановлення залежностей (npm install)
# Переконайтесь що .env заповнений правильно

set -e

echo "==> Генеруємо Prisma Client..."
npx prisma generate

echo "==> Застосовуємо схему до бази даних..."
npx prisma db push

echo ""
echo "✓ База даних готова!"
echo ""
echo "Щоб переглянути дані у браузері:"
echo "  npx prisma studio"
