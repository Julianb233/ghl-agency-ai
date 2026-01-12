#!/bin/bash
# Ralph runner script
# Usage: ./scripts/ralph/ralph.sh [max_iterations]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

MAX_ITERATIONS="${1:-10}"

echo "Starting Ralph with max $MAX_ITERATIONS iterations..."
npx tsx "$SCRIPT_DIR/ralph.ts" "$MAX_ITERATIONS"
