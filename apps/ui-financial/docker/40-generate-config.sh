#!/bin/sh
set -e

envsubst '${API_BASE_URL} ${AUTH_AUTHORITY} ${AUTH_CLIENT_ID}' \
  < /usr/share/nginx/html/config.template.js \
  > /usr/share/nginx/html/config.js
