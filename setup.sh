#!/bin/bash

echo "Installing wallpapper..."
echo "This requires Homebrew (https://brew.sh/)"

# https://github.com/mczachurski/wallpapper?tab=readme-ov-file#homebrew
brew tap mczachurski/wallpapper
brew install wallpapper

echo "Installing WebKit browser for Playwright..."
npx playwright install webkit

echo "✅ Setup complete!"