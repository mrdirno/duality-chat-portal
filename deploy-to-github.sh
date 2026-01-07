#!/bin/bash
# DUALITY Spark Chat - GitHub Pages Deployment Script
# This deploys the ACTUAL Spark Chat portal (not remote-portal dashboard)
# Usage: ./deploy-to-github.sh [github-username]

set -e

USERNAME=${1:-"mrdirno"}
REPO_NAME="duality-spark-chat"

echo "=== DUALITY Spark Chat - GitHub Pages Deployment ==="
echo ""
echo "This deploys the Spark Chat portal for GLOBAL access."
echo "Connects to Firestore (helios-spark-zero) for real-time messaging."
echo ""

# Verify we're in chat-portal directory
if [ ! -f "js/spark-chat.js" ]; then
    echo "ERROR: Must run from chat-portal directory!"
    echo "  cd /Volumes/dual/DUALITY-ZERO-V2/chat-portal"
    exit 1
fi

# Create deployment directory
DEPLOY_DIR="/tmp/duality-spark-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy files (only what's needed for deployment)
echo "Copying files..."
cp index.html "$DEPLOY_DIR/"
cp -r css "$DEPLOY_DIR/"
cp -r js "$DEPLOY_DIR/"

# Remove any local-only files
rm -f "$DEPLOY_DIR/data" 2>/dev/null || true

cd "$DEPLOY_DIR"

# Initialize git
echo "Initializing git repository..."
git init
git add .
git commit -m "Deploy DUALITY Spark Chat

Global access portal with:
- Firebase Auth (Google Sign-In)
- Firestore real-time messaging (helios-spark-zero)
- Mobile-optimized authentication

Co-Authored-By: Claude <noreply@anthropic.com>"

# Add remote and push
echo ""
echo "Setting up GitHub remote..."
git remote add origin "https://github.com/${USERNAME}/${REPO_NAME}.git"
git branch -M main

echo ""
echo "=== Manual Steps Required ==="
echo ""
echo "1. Create repository on GitHub:"
echo "   https://github.com/new"
echo "   - Name: ${REPO_NAME}"
echo "   - Public repository (required for GitHub Pages free tier)"
echo ""
echo "2. Push to GitHub:"
echo "   cd $DEPLOY_DIR"
echo "   git push -u origin main"
echo ""
echo "3. Enable GitHub Pages:"
echo "   - Go to https://github.com/${USERNAME}/${REPO_NAME}/settings/pages"
echo "   - Source: Deploy from branch"
echo "   - Branch: main, folder: / (root)"
echo ""
echo "4. Add your GitHub Pages domain to Firebase Auth:"
echo "   - Go to Firebase Console > Authentication > Settings > Authorized domains"
echo "   - Add: ${USERNAME}.github.io"
echo ""
echo "5. Access your Spark Chat at:"
echo "   https://${USERNAME}.github.io/${REPO_NAME}/"
echo ""
echo "=== Deployment prepared in: $DEPLOY_DIR ==="
