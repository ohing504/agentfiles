#!/bin/bash
# Setup script for my-skill

echo "Setting up my-skill environment..."

# Check dependencies
if ! command -v node &> /dev/null; then
  echo "Node.js is required but not installed."
  exit 1
fi

echo "Setup complete!"
