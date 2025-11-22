@echo off
echo Starting Cryptee Frontend with Node.js compatibility fix...
set NODE_OPTIONS=--openssl-legacy-provider
npm start