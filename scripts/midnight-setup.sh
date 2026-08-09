#!/usr/bin/env bash
#
# Local Midnight toolchain setup.
#
# Everything in src/lib/zk ships and is tested against MockProver, which needs
# nothing installed. This script is what turns the *real* proving path on: it
# installs the Compact compiler, compiles circuits/datacenter-score.compact, and
# starts the proof server that MidnightProver talks to.
#
# Nothing here runs in CI. compactc and the proof server cannot run inside
# vitest, Playwright, or the Cloudflare Workers runtime.
#
# Usage:  ./scripts/midnight-setup.sh [check|install|compile|serve|all]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CIRCUIT="$ROOT/circuits/datacenter-score.compact"
OUT_DIR="$ROOT/circuits/build"
PROOF_SERVER_IMAGE="midnightnetwork/proof-server:latest"
PROOF_SERVER_PORT="${MIDNIGHT_PROOF_SERVER_PORT:-6300}"

info() { printf '\033[36m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[33m!!\033[0m %s\n' "$1" >&2; }
die()  { printf '\033[31mxx\033[0m %s\n' "$1" >&2; exit 1; }

check() {
  local ok=0
  info "Checking the toolchain"

  export PATH="$HOME/.local/bin:$PATH"
  if command -v compact >/dev/null 2>&1; then
    printf '  compact      : %s\n' "$(compact --version 2>/dev/null || echo present)"
  else
    printf '  compact      : MISSING\n'; ok=1
  fi

  if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
      printf '  docker       : running\n'
    else
      printf '  docker       : installed but the daemon is not running\n'; ok=1
    fi
  else
    printf '  docker       : MISSING\n'; ok=1
  fi

  if curl -fsS "http://127.0.0.1:${PROOF_SERVER_PORT}/health" >/dev/null 2>&1; then
    printf '  proof server : responding on :%s\n' "$PROOF_SERVER_PORT"
  else
    printf '  proof server : not responding on :%s\n' "$PROOF_SERVER_PORT"; ok=1
  fi

  if [ -d "$OUT_DIR" ]; then
    printf '  compiled     : %s\n' "$OUT_DIR"
  else
    printf '  compiled     : not built\n'; ok=1
  fi

  if [ -f "$OUT_DIR/keys/proveThreshold.verifier" ]; then
    printf '  keys         : prover + verifier generated\n'
  else
    printf '  keys         : not generated\n'; ok=1
  fi

  if [ "$ok" -eq 0 ]; then
    info "Ready. Set MIDNIGHT_PROOF_SERVER_URL=http://127.0.0.1:${PROOF_SERVER_PORT} to use the real prover."
  else
    warn "Some pieces are missing. The app still runs — it falls back to MockProver in development."
  fi
  return 0
}

install_toolchain() {
  info "Installing the Compact toolchain"
  command -v curl >/dev/null 2>&1 || die "curl is required"
  # The official installer manages compactc versions.
  # The installer places the launcher in $XDG_BIN_HOME, $XDG_DATA_HOME/../bin,
  # or $HOME/.local/bin — verified: it lands in ~/.local/bin on macOS.
  curl --proto '=https' --tlsv1.2 -LsSf \
    https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh \
    -o /tmp/compact-installer.sh
  sh /tmp/compact-installer.sh --quiet
  export PATH="$HOME/.local/bin:$PATH"
  info "Fetching the compiler toolchain"
  compact update
  info "Ensure \$HOME/.local/bin is on your PATH, then re-run: $0 check"
}

compile() {
  [ -f "$CIRCUIT" ] || die "Circuit not found at $CIRCUIT"
  export PATH="$HOME/.local/bin:$PATH"
  command -v compact >/dev/null 2>&1 || die "compact not on PATH — run: $0 install"
  info "Compiling $(basename "$CIRCUIT")"
  mkdir -p "$OUT_DIR"
  compact compile "$CIRCUIT" "$OUT_DIR"
  info "Artefacts written to $OUT_DIR"
}

serve() {
  command -v docker >/dev/null 2>&1 || die "docker not found"
  docker info >/dev/null 2>&1 || die "the Docker daemon is not running"
  info "Starting the proof server on :$PROOF_SERVER_PORT"
  docker run --rm -p "${PROOF_SERVER_PORT}:6300" "$PROOF_SERVER_IMAGE" \
    -- 'midnight-proof-server --network testnet'
}

case "${1:-check}" in
  check)   check ;;
  install) install_toolchain ;;
  compile) compile ;;
  serve)   serve ;;
  all)     install_toolchain; compile; serve ;;
  *)       die "Usage: $0 [check|install|compile|serve|all]" ;;
esac
