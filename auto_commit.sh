#!/bin/bash
# Enhanced Auto-Commit Agent

COUNTER_FILE="$(dirname "$0")/counter.json"

# Read count from counter.json, init to 0 if missing or invalid
if [[ -f "$COUNTER_FILE" ]] && command -v python3 &>/dev/null; then
  count=$(python3 -c "import json,sys; d=json.load(open('$COUNTER_FILE')); print(d.get('count',0))" 2>/dev/null || echo 0)
else
  count=0
  echo "{\"count\": $count}" > "$COUNTER_FILE"
fi

update_counter() {
  python3 -c "
import json
with open('$COUNTER_FILE', 'w') as f:
    json.dump({'count': $1}, f)
    f.write('\n')
"
}

# Detect current branch once at startup
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Auto-commit running on branch: $BRANCH (starting count: $count)"

while true; do
  # Repair corrupted index file before anything else
  if ! git status -s &>/dev/null; then
    echo "WARNING: git index corrupted. Attempting repair..."
    rm -f .git/index .git/index.lock ".git/refs/heads/${BRANCH}.lock"
    git reset HEAD --quiet 2>/dev/null || true
    echo "Index repaired."
  fi

  # Remove stale locks
  rm -f .git/index.lock ".git/refs/heads/${BRANCH}.lock"

  if [[ -n $(git status -s 2>/dev/null) ]]; then
    echo "Changes detected, attempting to commit..."

    git add .

    if git commit -m "Auto-commit: Project implementation in progress [count: $count]" --no-verify; then
      echo "Commit successful. Syncing with remote..."

      # Pull with rebase first, then push
      if git pull origin "$BRANCH" --rebase; then
        if git push origin "$BRANCH"; then
          echo "Push successful."
        else
          echo "Push failed. Will retry in next cycle."
        fi
      else
        echo "Pull/Rebase failed. Aborting rebase to keep repo clean."
        git rebase --abort
      fi
    else
      echo "Commit failed (likely nothing to commit)."
    fi
  else
    echo "No changes detected. Skipping commit cycle."

    # Fetch remote state before comparing
    git fetch origin "$BRANCH" --quiet 2>/dev/null || true
    LOCAL=$(git rev-parse HEAD 2>/dev/null)
    REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null)

    if [[ "$LOCAL" != "$REMOTE" ]]; then
      echo "Local and remote diverged. Syncing..."
      if git pull origin "$BRANCH" --rebase; then
        if git push origin "$BRANCH"; then
          echo "Sync push successful."
        else
          echo "Sync push failed. Will retry in next cycle."
        fi
      else
        echo "Pull/Rebase failed during sync. Aborting."
        git rebase --abort
      fi
    fi
  fi

  # Always increment and persist counter at end of every cycle
  count=$((count + 1))
  update_counter "$count"
  echo "count: $count"

  echo "Sleeping for 0.00001 seconds..."
  sleep 0.00001
done
