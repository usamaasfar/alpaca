#!/bin/bash

# Fix Electron installation issue
# This script removes node_modules and does a fresh install

echo "🔧 Fixing Electron installation..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Remove all node_modules
echo "🗑️  Removing node_modules..."
rm -rf node_modules
rm -rf apps/desktop/node_modules

# Fresh install
echo "📦 Running fresh npm install..."
npm install

# Run electron install script manually to ensure it works
if [ -d "node_modules/electron" ]; then
    echo "🔧 Running Electron install script..."
    cd node_modules/electron && node install.js
    cd ../..

    # Create symlink for Electron Forge compatibility
    echo "🔗 Creating symlink for Electron Forge..."
    mkdir -p apps/desktop/node_modules
    ln -sf ../../../node_modules/electron apps/desktop/node_modules/electron

    echo "✅ Electron installation fixed!"
else
    echo "❌ Something went wrong with the installation."
    exit 1
fi
