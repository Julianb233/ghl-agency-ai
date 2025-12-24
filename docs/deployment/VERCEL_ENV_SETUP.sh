#!/bin/bash

###############################################################################
# Vercel Environment Variables Setup Script
# This script helps configure all required environment variables in Vercel
#
# Usage: bash VERCEL_ENV_SETUP.sh
#
# Prerequisites:
#   1. Install Vercel CLI: npm install -g vercel
#   2. Run: vercel login
#   3. Run: vercel link (from project directory)
#   4. Set up .env.local with all values
###############################################################################

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Vercel Environment Variables Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}ERROR: Vercel CLI not found. Install it first:${NC}"
    echo "npm install -g vercel"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}ERROR: .env.local not found in $(pwd)${NC}"
    echo "Please create .env.local with environment variables"
    exit 1
fi

# Function to set a single environment variable
set_env_var() {
    local var_name=$1
    local var_value=$(grep "^${var_name}=" .env.local | cut -d'=' -f2- | sed 's/^"//' | sed 's/"$//')

    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}⊘ SKIP${NC} ${var_name} (not found in .env.local)"
        return
    fi

    echo -e "${BLUE}→ Setting${NC} ${var_name}"
    # Use echo to pipe the value to vercel env add to avoid interactive prompt
    echo "$var_value" | vercel env add "$var_name" --environment=production --yes 2>/dev/null || {
        echo -e "${YELLOW}  (may already exist, skipping)${NC}"
    }
}

# Phase 1: Critical variables
echo -e "${GREEN}PHASE 1: Critical Variables (Required for API to work)${NC}"
echo "================================================"
set_env_var "DATABASE_URL"
set_env_var "JWT_SECRET"
set_env_var "ANTHROPIC_API_KEY"
set_env_var "BROWSERBASE_API_KEY"
set_env_var "BROWSERBASE_PROJECT_ID"
echo ""

# Phase 2: Important variables
echo -e "${GREEN}PHASE 2: Important Variables (Before public launch)${NC}"
echo "================================================"
set_env_var "STRIPE_WEBHOOK_SECRET"
set_env_var "SENTRY_DSN"
set_env_var "OAUTH_SERVER_URL"
set_env_var "OWNER_OPEN_ID"
set_env_var "GHL_API_KEY"
set_env_var "GHL_CLIENT_ID"
set_env_var "GHL_CLIENT_SECRET"
set_env_var "GHL_SECRET_KEY"
set_env_var "GOOGLE_CLIENT_ID"
set_env_var "GOOGLE_CLIENT_SECRET"
set_env_var "GOOGLE_REDIRECT_URI"
set_env_var "OPENAI_API_KEY"
set_env_var "ENCRYPTION_KEY"
echo ""

# Phase 3: Recommended variables
echo -e "${GREEN}PHASE 3: Recommended Variables (For better functionality)${NC}"
echo "================================================"
set_env_var "REDIS_URL"
set_env_var "RESEND_API_KEY"
set_env_var "GMAIL_CLIENT_ID"
set_env_var "GMAIL_CLIENT_SECRET"
set_env_var "GMAIL_REDIRECT_URI"
set_env_var "STAGEHAND_MODEL"
set_env_var "DATABASE_URL_UNPOOLED"
set_env_var "VITE_APP_TITLE"
set_env_var "VITE_APP_LOGO"
echo ""

# Verify deployment
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Environment Variables Setup Complete${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Verify variables were set:"
echo "   ${BLUE}vercel env list --environment=production${NC}"
echo ""
echo "2. Redeploy the application:"
echo "   ${BLUE}vercel deploy --prod${NC}"
echo ""
echo "3. Test the health endpoint:"
echo "   ${BLUE}curl https://ghlagencyai.com/api/health${NC}"
echo ""
echo -e "${YELLOW}To manually add a variable:${NC}"
echo "   ${BLUE}echo 'YOUR_VALUE' | vercel env add VARIABLE_NAME --environment=production${NC}"
echo ""
echo -e "${YELLOW}To view logs after deployment:${NC}"
echo "   ${BLUE}vercel logs --follow${NC}"
echo ""
