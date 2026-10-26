#!/usr/bin/env bash
echo "=============================================="
echo " Starting TruthLens AI Fact-Checking Platform "
echo "=============================================="

# Ensure script runs from project root
cd "$(dirname "$0")"

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed or not in PATH."
    exit 1
fi

echo "Launching backend server on http://127.0.0.1:8000 ..."
cd backend
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
