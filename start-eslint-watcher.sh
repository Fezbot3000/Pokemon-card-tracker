#!/bin/bash

# ESLint Watcher Startup Script
# This script starts the ESLint watcher in the background and provides process management

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PID_FILE="$SCRIPT_DIR/eslint-watcher.pid"
LOG_FILE="$SCRIPT_DIR/eslint-watcher.log"

# Function to check if watcher is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to start the watcher
start_watcher() {
    if is_running; then
        echo "❌ ESLint watcher is already running (PID: $(cat "$PID_FILE"))"
        exit 1
    fi
    
    echo "🚀 Starting ESLint watcher..."
    
    # Start the watcher in the background
    nohup node "$SCRIPT_DIR/eslint-watcher.js" > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    # Give it a moment to start
    sleep 2
    
    if is_running; then
        echo "✅ ESLint watcher started successfully (PID: $(cat "$PID_FILE"))"
        echo "📁 Log file: $LOG_FILE"
        echo "📊 Check status with: node eslint-watcher.js --status"
        echo "🛑 Stop with: ./stop-eslint-watcher.sh"
    else
        echo "❌ Failed to start ESLint watcher"
        if [ -f "$LOG_FILE" ]; then
            echo "📋 Last few log lines:"
            tail -n 5 "$LOG_FILE"
        fi
        exit 1
    fi
}

# Function to stop the watcher
stop_watcher() {
    if ! is_running; then
        echo "❌ ESLint watcher is not running"
        exit 1
    fi
    
    PID=$(cat "$PID_FILE")
    echo "🛑 Stopping ESLint watcher (PID: $PID)..."
    
    kill $PID
    
    # Wait for graceful shutdown
    for i in {1..10}; do
        if ! ps -p $PID > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # Force kill if still running
    if ps -p $PID > /dev/null 2>&1; then
        echo "⚠️  Forcefully killing watcher..."
        kill -9 $PID
    fi
    
    rm -f "$PID_FILE"
    echo "✅ ESLint watcher stopped successfully"
}

# Function to show status
show_status() {
    if is_running; then
        echo "✅ ESLint watcher is running (PID: $(cat "$PID_FILE"))"
        echo "📁 Log file: $LOG_FILE"
        echo ""
        node "$SCRIPT_DIR/eslint-watcher.js" --status
    else
        echo "❌ ESLint watcher is not running"
    fi
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo "📋 ESLint watcher logs:"
        tail -n 20 "$LOG_FILE"
    else
        echo "❌ No log file found"
    fi
}

# Main command handling
case "${1:-start}" in
    start)
        start_watcher
        ;;
    stop)
        stop_watcher
        ;;
    restart)
        if is_running; then
            stop_watcher
            sleep 2
        fi
        start_watcher
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the ESLint watcher"
        echo "  stop     - Stop the ESLint watcher"
        echo "  restart  - Restart the ESLint watcher"
        echo "  status   - Show watcher status and ESLint results"
        echo "  logs     - Show recent watcher logs"
        exit 1
        ;;
esac 