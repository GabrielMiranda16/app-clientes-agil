#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Uso: ./push.sh \"mensagem do commit\""
  exit 1
fi

git add .
git commit -m "$1"
git push origin "$(git branch --show-current)"
