#!/bin/bash

echo "Installing imagemagick and wallpapper..."
echo "This requires Homebrew (https://brew.sh/)"

# https://github.com/mczachurski/wallpapper?tab=readme-ov-file#homebrew
brew tap mczachurski/wallpapper
brew install wallpapper
brew install imagemagick

echo "Installing Chromium browser for Playwright..."
npx playwright install chromium

echo "✅ Setup complete!"