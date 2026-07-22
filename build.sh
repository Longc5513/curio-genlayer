#!/bin/bash
set -e
cd app
npm ci --legacy-peer-deps
npm run build
