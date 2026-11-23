#!/usr/bin/env bash
# Deutli guard: fails on things we never want to ship. Run with `npm run guard` (part of `npm run check`).
set -u
fail=0

# 1) Browser-default date and time inputs (use DatePicker / TimePicker from src/components/ui/date-picker.tsx).
if grep -rnE 'type="(date|time|datetime-local|month|week)"' src; then
  echo "ERROR: native date/time input found. Use DatePicker / TimePicker."; fail=1
fi

# 2) Raw <select> (use OptionSelect from src/components/ui/option-select.tsx or the shadcn Select).
if grep -rnE '<select\b' src; then
  echo "ERROR: raw <select> found. Use OptionSelect."; fail=1
fi

# 3) Secrets in tracked files.
if git grep -nE 'sk_live_[A-Za-z0-9]{10,}|sk_test_[A-Za-z0-9]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|sb_secret_[A-Za-z0-9_]{10,}' -- . ':!scripts/guard.sh' ':!.env.example'; then
  echo "ERROR: something that looks like a secret is committed."; fail=1
fi

# 4) The secret key must never be public.
if grep -rnE 'NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE_ROLE)' src .env.example; then
  echo "ERROR: a secret is exposed through NEXT_PUBLIC_."; fail=1
fi

[ "$fail" -eq 0 ] && echo "guard: OK"
exit "$fail"
