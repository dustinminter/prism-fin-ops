#!/bin/sh
# Extract DNS resolver from /etc/resolv.conf for nginx
export RESOLVER=$(grep nameserver /etc/resolv.conf | head -1 | awk '{print $2}')
if [ -z "$RESOLVER" ]; then
    # Fallback to common Kubernetes DNS
    export RESOLVER="10.96.0.10"
fi
echo "Using DNS resolver: $RESOLVER"

# Run the standard nginx docker entrypoint
exec /docker-entrypoint.sh nginx -g "daemon off;"
