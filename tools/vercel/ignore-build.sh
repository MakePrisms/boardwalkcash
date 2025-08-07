#!/bin/bash

BRANCH="$VERCEL_GIT_COMMIT_REF"

echo "BRANCH: $BRANCH"

if [[ "$BRANCH" == "main" || "$BRANCH" == boardwalk/* ]]; then
  echo "🛑 - Build cancelled"
  exit 0
else
  echo "✅ - Build can proceed"
  exit 1
fi