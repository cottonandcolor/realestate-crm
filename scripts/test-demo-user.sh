#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:3000}"
COOKIE_JAR="/tmp/crm-demo-cookies.txt"

rm -f "$COOKIE_JAR"

echo "=== Demo user test ($BASE) ==="
echo ""

echo "1. Demo login (POST /api/dev/login)"
LOGIN=$(curl -s -c "$COOKIE_JAR" -X POST "$BASE/api/dev/login")
echo "   $LOGIN"
if ! echo "$LOGIN" | grep -q '"ok":true'; then
  echo "   FAIL: demo login"
  exit 1
fi
echo "   PASS"

echo ""
echo "2. Dashboard with session"
CODE=$(curl -s -b "$COOKIE_JAR" -o /tmp/crm-dashboard.html -w "%{http_code}" "$BASE/dashboard")
if [ "$CODE" != "200" ]; then
  echo "   FAIL: dashboard HTTP $CODE"
  exit 1
fi
for text in "Demo mode" "Alice Johnson" "Modern Condo" "Call new leads"; do
  if grep -q "$text" /tmp/crm-dashboard.html; then
    echo "   PASS: contains '$text'"
  else
    echo "   FAIL: missing '$text'"
    exit 1
  fi
done

echo ""
echo "3. Move task (PATCH /api/dev/tasks)"
TASK_RES=$(curl -s -b "$COOKIE_JAR" -X PATCH "$BASE/api/dev/tasks" \
  -H "Content-Type: application/json" \
  -d '{"taskId":"30000000-0000-4000-8000-000000000001","status":"inprogress"}')
echo "   $TASK_RES"
if ! echo "$TASK_RES" | grep -q '"ok":true'; then
  echo "   FAIL: task update"
  exit 1
fi
echo "   PASS"

echo ""
echo "4. CSV import (POST /api/dev/listings/import)"
IMPORT=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE/api/dev/listings/import" \
  -H "Content-Type: application/json" \
  -d '{"data":"title,address,price,status,external_id\nTest Villa,99 Demo Ln,$5000,active,demo-villa-99"}')
echo "   $IMPORT"
if ! echo "$IMPORT" | grep -q '"imported":1'; then
  echo "   FAIL: listing import"
  exit 1
fi
echo "   PASS"

echo ""
echo "5. Logout"
curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE/api/dev/logout" >/dev/null
CODE=$(curl -s -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$BASE/dashboard")
if [ "$CODE" = "307" ] || [ "$CODE" = "302" ]; then
  echo "   PASS: dashboard redirects after logout ($CODE)"
else
  echo "   WARN: expected redirect after logout, got $CODE"
fi

echo ""
echo "=== All demo user tests passed ==="
echo ""
echo "Browser: open $BASE/login → click 'Continue as Demo Agent'"
echo "Credentials (display only): demo.agent@realestate.test"
