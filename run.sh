#!/bin/bash

PORT=3000
SCRIPT="server.js"

# Find process using the port
PID=$(lsof -ti tcp:$PORT)

if [ -n "$PID" ]; then
  echo "Port $PORT is in use by PID $PID. Killing process..."
  kill -9 $PID
else
  echo "Port $PORT is not in use."
fi

# Start the node server in background
echo "Starting $SCRIPT..."
npm install
nohup node $SCRIPT > server.log 2>&1 &

echo "Server started in background."

