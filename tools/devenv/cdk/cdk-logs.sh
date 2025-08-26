#!/bin/bash

# Default number of lines to show
DEFAULT_LINES=50

# Parse command line arguments
LINES=${1:-$DEFAULT_LINES}

# Validate that LINES is a number
if ! [[ "$LINES" =~ ^[0-9]+$ ]]; then
  echo "❌ Invalid number of lines: $LINES"
  echo "Usage: cdk-logs [number_of_lines]"
  echo "Example: cdk-logs 100"
  echo "Default: $DEFAULT_LINES lines"
  exit 1
fi

LOGS_DIR="$DEVENV_ROOT/.cdk-mint/logs"

# Check if logs directory exists
if [ ! -d "$LOGS_DIR" ]; then
  echo "❌ No logs directory found. Start the mint first with 'cdk-mint'"
  exit 1
fi

# Find the latest log file (format: cdk-mintd.log.YYYY-MM-DD)
LATEST_LOG=$(ls -t "$LOGS_DIR"/cdk-mintd.log.* 2>/dev/null | head -n 1)

if [ -n "$LATEST_LOG" ] && [ -f "$LATEST_LOG" ]; then
  echo "📖 Showing latest CDK mint logs from $(basename "$LATEST_LOG") (last $LINES lines):"
  echo "📁 $LATEST_LOG"
  echo ""
  
  tail -n "$LINES" -f "$LATEST_LOG"
else
  echo "❌ No CDK mint log files found in $LOGS_DIR"
  echo "📁 Available files:"
  ls -la "$LOGS_DIR/" 2>/dev/null || echo "   (directory is empty)"
fi
