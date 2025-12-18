#!/bin/bash

# Rebrand GHL Agency AI to Bottleneck Bots
# This script updates all text references while keeping file/folder names intact

cd /root/github-repos/ghl-agency-ai

# Update "GHL Agency AI" to "Bottleneck Bots" in all markdown and documentation files
find . -type f \( -name "*.md" -o -name "*.txt" \) ! -path "*/node_modules/*" ! -path "*/.git/*" -exec sed -i 's/GHL Agency AI/Bottleneck Bots/g' {} +

# Update "ghl.agency.ai" domain references to "bottleneckbots.com" (case insensitive)
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.yaml" -o -name "*.yml" -o -name "*.json" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/package-lock.json" -exec sed -i 's/ghl\.agency\.ai/bottleneckbots.com/gi' {} +

# Update helm chart references
find ./helm -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.tpl" -o -name "*.txt" \) -exec sed -i 's/ghl-agency-ai/bottleneck-bots/g' {} +

# Update gitops references
find ./gitops -type f \( -name "*.yaml" -o -name "*.yml" \) -exec sed -i 's/ghl-agency-ai/bottleneck-bots/g' {} +

echo "Rebranding complete!"
