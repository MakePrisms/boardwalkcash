#!/bin/bash

echo "🪙 Starting CDK Mint..."

# Fallback to main if not set
CDK_REF="${CDK_REF:-main}"
echo "📍 Using CDK reference: $CDK_REF"

ensure_docker_compose() {
  command -v docker &> /dev/null || {
    echo "❌ Docker not found. Install Docker to use Keycloak authentication"
    return 1
  }
  docker compose version &> /dev/null || {
    echo "❌ Docker Compose not available"
    return 1
  }
}

# Function to check if auth is enabled in config
check_auth_enabled() {
  local config_file="$DEVENV_ROOT/tools/devenv/cdk/cdk-mint.config.toml"
  [ -f "$config_file" ] && grep -q "^auth_enabled = true" "$config_file"
}

start_keycloak() {
  local cdk_dir="$1"
  local keycloak_compose="$cdk_dir/misc/keycloak/docker-compose-recover.yml"
  local keycloak_export="$cdk_dir/misc/keycloak/keycloak-export"
  
  ensure_docker_compose || return 1
  
  [ -f "$keycloak_compose" ] && [ -d "$keycloak_export" ] || {
    echo "❌ Keycloak files not found:"
    echo "   Expected: $keycloak_compose"
    echo "   Expected: $keycloak_export"
    return 1
  }
  
  echo "🔐 Starting Keycloak..."
  cd "$cdk_dir/misc/keycloak"
  docker compose -f docker-compose-recover.yml up -d || {
    echo "❌ Failed to start Keycloak"
    return 1
  }
  
  sleep 2
  echo "📋 Monitoring Keycloak logs..."
  docker compose -f docker-compose-recover.yml logs -f &
  echo $! > "$DEVENV_ROOT/.cdk-mint/keycloak-logs.pid"
  
  echo "✅ Keycloak started at http://127.0.0.1:8080"
}

cleanup() {
  echo "🧹 Cleaning up..."
  
  # Kill Keycloak logs if running
  if [ -f "$DEVENV_ROOT/.cdk-mint/keycloak-logs.pid" ]; then
    local logs_pid=$(cat "$DEVENV_ROOT/.cdk-mint/keycloak-logs.pid")
    kill -0 "$logs_pid" 2>/dev/null && kill "$logs_pid" 2>/dev/null
    rm -f "$DEVENV_ROOT/.cdk-mint/keycloak-logs.pid"
  fi
  
  # Stop Keycloak if it was started
  if [ -f "$DEVENV_ROOT/.cdk-mint/keycloak-started" ]; then
    echo "🔐 Stopping Keycloak..."
    cd "$CDK_DIR/misc/keycloak" 2>/dev/null && docker compose -f docker-compose-recover.yml down
    rm -f "$DEVENV_ROOT/.cdk-mint/keycloak-started"
  fi
  
  exit 0
}

# Set up signal handlers for cleanup
trap cleanup SIGINT SIGTERM

mkdir -p "$DEVENV_ROOT/.cdk-mint"
CDK_DIR="$DEVENV_ROOT/.cdk-mint/cdk-source"

# Function to extract GitHub org/user from URL
get_github_remote_name() {
  local url="$1"
  # Extract org/user from GitHub URL (handles both https and git formats)
  echo "$url" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|'
}

# Check if we need to clone or update the repository
if [ ! -d "$CDK_DIR" ]; then
  echo "📦 Cloning CDK repository..."
  git clone "$CDK_REPO" "$CDK_DIR"
  cd "$CDK_DIR"
  git checkout "$CDK_REF"
else
  cd "$CDK_DIR"
  
  # Get the remote name based on GitHub org/user
  remote_name=$(get_github_remote_name "$CDK_REPO")
  current_origin=$(git remote get-url origin 2>/dev/null || echo "")
  
  if [ "$current_origin" != "$CDK_REPO" ]; then
    echo "🔄 Switching from $(get_github_remote_name "$current_origin") to $remote_name"
    
    # Check if we already have this remote
    if git remote get-url "$remote_name" &>/dev/null; then
      echo "📡 Remote '$remote_name' already exists, updating URL..."
      git remote set-url "$remote_name" "$CDK_REPO"
    else
      echo "📡 Adding new remote '$remote_name'..."
      git remote add "$remote_name" "$CDK_REPO"
    fi
    
    # Fetch from the new remote
    echo "📥 Fetching from $remote_name..."
    git fetch "$remote_name" --tags
    
    # Set the new remote as origin
    git remote set-url origin "$CDK_REPO"
    
    # Try to checkout the ref from the new remote
    echo "🔄 Switching to $CDK_REF from $remote_name..."
    git checkout "$CDK_REF" 2>/dev/null || {
      # If the ref doesn't exist locally, try to create it from the remote
      git checkout -b "$CDK_REF" "$remote_name/$CDK_REF" 2>/dev/null || {
        # If it's a tag or commit, just checkout directly
        git fetch "$remote_name" "$CDK_REF:$CDK_REF" 2>/dev/null || true
        git checkout "$CDK_REF"
      }
    }
  else
    echo "🔄 Updating CDK repository from $remote_name..."
    git fetch --all --tags
    git checkout "$CDK_REF"
    if git show-ref --verify --quiet "refs/heads/$CDK_REF" || git show-ref --verify --quiet "refs/remotes/origin/$CDK_REF"; then
      git pull origin "$CDK_REF" 2>/dev/null || true
    fi
  fi
fi

cd "$CDK_DIR"

# Check if auth is enabled and start Keycloak if needed
if check_auth_enabled; then  start_keycloak "$CDK_DIR" || {
    echo "❌ Failed to start Keycloak. Cannot start CDK mint with auth enabled."
    exit 1
  }
  touch "$DEVENV_ROOT/.cdk-mint/keycloak-started"
  FEATURES="auth,fakewallet"
else
  FEATURES="fakewallet"
fi

echo "🚀 Starting CDK mint with features: $FEATURES"

cargo run --package cdk-mintd --features "$FEATURES" -- \
  --config "$DEVENV_ROOT/tools/devenv/cdk/cdk-mint.config.toml" \
  --work-dir "$DEVENV_ROOT/.cdk-mint" \
  2>&1
