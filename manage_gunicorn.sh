#!/bin/bash

PIDFILE="gunicorn.pid"

start() {
    echo "Starting gunicorn..."
    if [ -f "$PIDFILE" ]; then
        echo "Removing stale PID file..."
        rm -f "$PIDFILE"
    fi
    source venv/bin/activate
    gunicorn -c gunicorn_config.py wsgi:app --daemon
    echo "Gunicorn started"
}

stop() {
    echo "Stopping gunicorn..."
    if [ -f "$PIDFILE" ]; then
        pid=$(cat "$PIDFILE")
        echo "Stopping process $pid..."
        kill $pid
        sleep 2
        if kill -0 $pid 2>/dev/null; then
            echo "Force killing process..."
            kill -9 $pid
        fi
        rm -f "$PIDFILE"
    else
        echo "No PID file found, killing all gunicorn processes..."
        pkill -f gunicorn
        sleep 2
        if pgrep -f gunicorn > /dev/null; then
            echo "Force killing remaining processes..."
            pkill -9 -f gunicorn
        fi
    fi
    echo "Cleaning up port 5001..."
    sudo fuser -k 5001/tcp 2>/dev/null
    echo "Gunicorn stopped"
}

status() {
    if [ -f "$PIDFILE" ]; then
        pid=$(cat "$PIDFILE")
        if kill -0 $pid 2>/dev/null; then
            echo "Gunicorn is running (PID: $pid)"
            return 0
        else
            echo "Found stale PID file"
            rm -f "$PIDFILE"
        fi
    fi
    if pgrep -f gunicorn > /dev/null; then
        echo "Gunicorn is running (no PID file)"
        return 0
    else
        echo "Gunicorn is not running"
        return 1
    fi
}

restart() {
    stop
    sleep 2
    start
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0 