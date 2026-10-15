#!/usr/bin/env bash
set -e
SRC=/mnt/c/Users/gs-en/Projects/brightpath
DST=/home/mahalakshmi/Brightpath
cd "$SRC"
FILES=$(git status --porcelain --untracked-files=all | awk '{print $NF}' | grep -E '^apps/' || true)
for f in $FILES; do
  if [ -f "$SRC/$f" ]; then
    mkdir -p "$DST/$(dirname "$f")"
    cp "$SRC/$f" "$DST/$f"
    sed -i 's/\r$//' "$DST/$f"
  fi
done
echo "synced: $(echo $FILES | wc -w) files"
cd "$DST/apps/api"
npx prisma generate >/dev/null 2>&1 && echo "prisma generate ok"
if [ "$1" = "push" ]; then npx prisma db push --skip-generate 2>&1 | tail -n 5; fi
npx tsc --noEmit -p . 2>&1 | head -n 60
echo "api tsc exit: ${PIPESTATUS[0]}"
if [ "$1" = "web" ] || [ "$2" = "web" ]; then
  cd "$DST/apps/web" && npx tsc --noEmit -p . 2>&1 | head -n 60
  echo "web tsc exit: ${PIPESTATUS[0]}"
fi
