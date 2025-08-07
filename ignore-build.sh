#!/bin/bash

BRANCH="$VERCEL_GIT_COMMIT_REF"

echo "BRANCH: $BRANCH"

if [[ "$BRANCH" == "main" || "$BRANCH" == boardwalk/* ]]; then
  echo "✅ - Build can proceed"
  exit 1
else
  echo "🛑 - Build cancelled"
  exit 0
fi