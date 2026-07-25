#!/bin/bash
set -e

git pull origin "$(git branch --show-current)"
