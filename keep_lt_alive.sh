#!/bin/bash
while true; do
  npx -y localtunnel --port 8000 --local-host 127.0.0.1 > lt.log
  sleep 2
done
