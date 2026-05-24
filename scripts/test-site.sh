#!/usr/bin/env bash
# Quick smoke test for local CRM
set -euo pipefail
BASE="${1:-http://localhost:3000}"

echo "Testing $BASE"
echo ""

test_route() {
  local path="$1"
  local expect="$2"
  local code
  code=$(curl -s -o /tmp/crm-test-body.html -w "%{http_code}" "$BASE$path" --max-time 10)
  local ok="FAIL"
  if [ "$code" = "$expect" ]; then ok="PASS"; fi
  printf "  %-6s %-28s (expected %s)\n" "$ok" "$path" "$expect"
  if [ "$ok" = "FAIL" ]; then
    echo "         got HTTP $code"
    return 1
  fi
  return 0
}

failed=0
test_route "/" "200" || failed=1
test_route "/login" "200" || failed=1
test_route "/signup" "200" || failed=1

# Dashboard should redirect unauthenticated users to login
dash=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/dashboard" --max-time 10)
if [ "$dash" = "307" ] || [ "$dash" = "308" ] || [ "$dash" = "302" ]; then
  echo "  PASS   /dashboard                   (redirect $dash — auth guard OK)"
else
  echo "  FAIL   /dashboard                   (expected redirect, got $dash)"
  failed=1
fi

# API routes without auth
for api in \
  "/api/listings/import" \
  "/api/calendar/events" \
  "/api/email/lead-assigned"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE$api" \
    -H "Content-Type: application/json" \
    -d '{}' --max-time 10)
  if [ "$code" = "401" ] || [ "$code" = "400" ] || [ "$code" = "503" ] || [ "$code" = "307" ]; then
    echo "  PASS   POST $api (HTTP $code)"
  else
    echo "  FAIL   POST $api (expected 401/400/503, got $code)"
    failed=1
  fi
done

# MLS webhook should reject without secret
wh=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/webhooks/mls" \
  -H "Content-Type: application/json" -d '{}' --max-time 10)
if [ "$wh" = "401" ]; then
  echo "  PASS   POST /api/webhooks/mls        (401 without secret)"
else
  echo "  FAIL   POST /api/webhooks/mls        (expected 401, got $wh)"
  failed=1
fi

# Page content checks
if grep -q "Real.Estate CRM" /tmp/crm-test-body.html 2>/dev/null; then
  echo "  PASS   home page contains title"
else
  echo "  WARN   home page title not found in last response body"
fi

echo ""
if [ "$failed" -eq 0 ]; then
  echo "All smoke tests passed."
else
  echo "Some tests failed."
  exit 1
fi
