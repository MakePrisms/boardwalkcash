#!/usr/bin/env bash

# Get the current hostname
HOSTNAME=$(hostname)

# Check if SSL certificates already exist
if [ -f "certs/localhost-cert.pem" ] && [ -f "certs/localhost-key.pem" ]; then
  echo "✅ SSL certificates already exist for this environment"
  echo "📝 Certificate includes: localhost, 127.0.0.1, ::1, $HOSTNAME"
  echo "🚀 Access your app at: https://localhost:3000 or https://$HOSTNAME:3000"
  echo "💡 Run 'generate-ssl-cert' to regenerate if needed"
  exit 0
fi

# SSL certificates don't exist, generate them
echo "🔍 SSL certificates not found, generating them automatically..."

# Check if mkcert CA is installed
if ! mkcert -CAROOT &>/dev/null; then
  echo "📋 Installing mkcert CA (you may be prompted for password)..."
  mkcert -install
fi

# Generate certificates
echo "🔧 Generating SSL certificate for: $HOSTNAME"

# Create certs directory if it doesn't exist
mkdir -p certs

# Generate certificate with current hostname
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost-cert.pem localhost 127.0.0.1 ::1 "$HOSTNAME"

echo "✅ SSL certificate generated!"
echo "📝 Certificate includes: localhost, 127.0.0.1, ::1, $HOSTNAME"
echo "🚀 You can now access your app at: https://localhost:3000 or https://$HOSTNAME:3000" 