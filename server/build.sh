#!/usr/bin/env bash
set -e

echo "==> Installing Node.js dependencies..."
# PUPPETEER_SKIP_DOWNLOAD skips Chromium download (set in .npmrc)
# Native addons like bcrypt NEED scripts to run for compilation
npm install

echo "==> Installing Python dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

echo "==> Build complete"
