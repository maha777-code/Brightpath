#!/usr/bin/env bash
SRC=/mnt/c/Users/gs-en/Projects/brightpath
DST=/home/mahalakshmi/Brightpath
cd "$SRC"
for f in $(git status --porcelain --untracked-files=all | awk '{print $NF}' | grep -E '^apps/web/' || true); do
  if [ -f "$SRC/$f" ] && ! cmp -s <(sed 's/\r$//' "$SRC/$f") "$DST/$f"; then
    mkdir -p "$DST/$(dirname "$f")"
    sed 's/\r$//' "$SRC/$f" > "$DST/$f"
    echo "updated $f"
  fi
done
