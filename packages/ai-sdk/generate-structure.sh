#!/bin/bash
# Script to generate complete @ezstart/ai-sdk structure

echo "🚀 Generating @ezstart/ai-sdk structure..."

# This script will be completed with all file creations
# For now, creating the directory structure

mkdir -p src/server/{registry,providers,core}
mkdir -p src/client/{components,hooks,store}
mkdir -p src/types

echo "✅ Directory structure created"
echo "📝 Ready for file generation"

ls -R src/
