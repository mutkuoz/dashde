#!/usr/bin/env bash
#
# dashde — installer
#
# Detects the distro (arch / fedora / debian / void / nix user profile),
# installs AGS v2 + required fonts + lm_sensors, symlinks config.yaml, and
# optionally adds a Hyprland autostart line.
#
# Usage:
#   ./install.sh             # full install
#   ./install.sh --no-fonts  # skip font install (assume fonts already present)
#   ./install.sh --no-hypr   # skip Hyprland autostart line
#   ./install.sh --dry-run   # show what would happen

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/dashboard"
HYPR_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/hypr/hyprland.conf"
FONT_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/fonts"

DO_FONTS=1
DO_HYPR=1
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --no-fonts) DO_FONTS=0 ;;
    --no-hypr)  DO_HYPR=0 ;;
    --dry-run)  DRY_RUN=1 ;;
    -h|--help)
      grep -E '^#( |$)' "$0" | sed -E 's/^# ?//'
      exit 0
      ;;
    *) echo "unknown option: $arg" >&2; exit 1 ;;
  esac
done

# ─── helpers ────────────────────────────────────────────────────────

C_OK="\033[32m"; C_WARN="\033[33m"; C_ERR="\033[31m"; C_DIM="\033[2m"; C_RST="\033[0m"

step()  { echo -e "${C_OK}▸${C_RST} $*"; }
info()  { echo -e "${C_DIM}  $*${C_RST}"; }
warn()  { echo -e "${C_WARN}!${C_RST} $*"; }
die()   { echo -e "${C_ERR}✗${C_RST} $*" >&2; exit 1; }

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    echo -e "${C_DIM}  [dry] $*${C_RST}"
  else
    eval "$@"
  fi
}

detect_distro() {
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    case "${ID,,}" in
      arch|manjaro|endeavouros) echo "arch" ;;
      fedora|nobara)            echo "fedora" ;;
      debian|ubuntu|pop|mint)   echo "debian" ;;
      void)                     echo "void" ;;
      nixos)                    echo "nixos" ;;
      *)                        echo "${ID,,}" ;;
    esac
  else
    echo "unknown"
  fi
}

# ─── 1. distro & deps ───────────────────────────────────────────────

DISTRO="$(detect_distro)"
step "distro detected · $DISTRO"

check_ags_collision() {
  # Adventure Game Studio also ships an `ags` binary. Catch it before the
  # user tries `ags run .` and gets "Unable to determine game data."
  if command -v ags >/dev/null 2>&1; then
    local ver
    ver="$(ags --version 2>&1 | head -n1 || true)"
    if echo "$ver" | grep -qi "adventure game studio"; then
      warn "found Adventure Game Studio on PATH at $(command -v ags)"
      warn "that's a different program — this project needs Aylur's GTK Shell v2."
      warn "remove the game engine first:"
      info "  sudo dnf remove ags        # fedora"
      info "  sudo apt remove ags        # debian/ubuntu"
      info "  sudo pacman -R ags         # arch (game-engine package, if installed)"
      warn "then re-run this installer or follow the manual AGS v2 steps."
      return 1
    fi
  fi
  return 0
}

install_deps() {
  case "$DISTRO" in
    arch)
      if command -v yay >/dev/null; then PKG="yay -S --needed --noconfirm"
      elif command -v paru >/dev/null; then PKG="paru -S --needed --noconfirm"
      else PKG="sudo pacman -S --needed --noconfirm"
      fi
      run "$PKG aylurs-gtk-shell dart-sass lm_sensors nmcli ttf-cormorant-garamond ttf-jetbrains-mono || true"
      ;;
    fedora)
      check_ags_collision || true
      run "sudo dnf install -y dart-sass lm_sensors NetworkManager jetbrains-mono-fonts \
        meson vala gjs gtk4-devel gtk4-layer-shell-devel libadwaita-devel \
        libsoup3-devel json-glib-devel wayland-protocols-devel upower-devel \
        gobject-introspection-devel || true"
      warn "AGS v2 is not in Fedora repos — build from source (see README → 'Fedora install')"
      warn "or use the one-liner:  nix run github:aylur/ags -- run $SCRIPT_DIR"
      ;;
    debian)
      check_ags_collision || true
      run "sudo apt-get install -y sass lm-sensors network-manager fonts-jetbrains-mono \
        meson valac gjs libgtk-4-dev libgtk4-layer-shell-dev libadwaita-1-dev \
        libsoup-3.0-dev libjson-glib-dev wayland-protocols libupower-glib-dev \
        libgirepository1.0-dev || true"
      warn "AGS v2 is not in Debian repos — build from source (see README → 'Debian install')"
      warn "or use the one-liner:  nix run github:aylur/ags -- run $SCRIPT_DIR"
      ;;
    void)
      run "sudo xbps-install -y dart-sass lm_sensors NetworkManager font-jetbrains-mono || true"
      warn "AGS v2 not in void repos — build from source"
      ;;
    nixos)
      info "NixOS: run the dashboard directly via flake:"
      info "  nix run github:aylur/ags -- run $SCRIPT_DIR"
      ;;
    *)
      warn "unknown distro — install manually: Aylur's GTK Shell v2 (NOT Adventure Game Studio),"
      warn "                                    dart-sass, lm_sensors, networkmanager, JetBrains Mono"
      ;;
  esac
}

step "installing system packages"
install_deps

# ─── 2. Google Fonts (Parisienne, Caveat, Cormorant, Darker Grotesque, Rajdhani) ──

fetch_font() {
  local name="$1" family="$2" filename="$3"
  local target="$FONT_DIR/$filename"
  if [[ -f "$target" ]]; then
    info "font already present · $name"
    return
  fi
  local url="https://github.com/google/fonts/raw/main/ofl/${family}/${filename}"
  info "fetching · $name"
  if [[ $DRY_RUN -eq 1 ]]; then
    info "[dry] curl -sL -o $target $url"
  else
    mkdir -p "$FONT_DIR"
    if ! curl -sL -o "$target" "$url"; then
      warn "could not download $name — continuing"
      rm -f "$target"
    fi
  fi
}

if [[ $DO_FONTS -eq 1 ]]; then
  step "installing fonts → $FONT_DIR"
  # luxury-journal trio
  fetch_font "Parisienne"           parisienne        "Parisienne-Regular.ttf"
  fetch_font "Caveat"               caveat            "Caveat%5Bwght%5D.ttf"
  fetch_font "Cormorant Garamond"   cormorantgaramond "CormorantGaramond-Regular.ttf"
  fetch_font "Cormorant Garamond"   cormorantgaramond "CormorantGaramond-Medium.ttf"
  # cyber-hud
  fetch_font "Rajdhani"             rajdhani          "Rajdhani-Regular.ttf"
  fetch_font "Rajdhani"             rajdhani          "Rajdhani-Medium.ttf"
  fetch_font "Rajdhani"             rajdhani          "Rajdhani-SemiBold.ttf"
  # minimal-mono
  fetch_font "Darker Grotesque"     darkergrotesque   "DarkerGrotesque%5Bwght%5D.ttf"

  if command -v fc-cache >/dev/null && [[ $DRY_RUN -eq 0 ]]; then
    fc-cache -f "$FONT_DIR" >/dev/null 2>&1 || true
    info "fontconfig cache refreshed"
  fi
fi

# ─── 3. seed config ─────────────────────────────────────────────────

step "seeding config → $CONFIG_DIR/config.yaml"
run "mkdir -p '$CONFIG_DIR'"
if [[ -e "$CONFIG_DIR/config.yaml" ]]; then
  warn "existing config preserved at $CONFIG_DIR/config.yaml"
  info "(compare with $SCRIPT_DIR/config/default.yaml if you want the latest defaults)"
else
  run "cp '$SCRIPT_DIR/config/default.yaml' '$CONFIG_DIR/config.yaml'"
fi

# Create notes directory for tasks/notes defaults
run "mkdir -p '$HOME/notes'"
if [[ ! -e "$HOME/notes/tasks.md" ]] && [[ $DRY_RUN -eq 0 ]]; then
  cat > "$HOME/notes/tasks.md" <<'EOF'
# tasks

- [ ] try dashde
- [ ] read the CONTRIBUTING.md to add a widget
- [x] install fonts
EOF
  info "seeded $HOME/notes/tasks.md"
fi
if [[ ! -e "$HOME/notes/scratch.md" ]] && [[ $DRY_RUN -eq 0 ]]; then
  printf "edit me — this pane saves automatically.\n" > "$HOME/notes/scratch.md"
  info "seeded $HOME/notes/scratch.md"
fi

# ─── 4. Hyprland autostart (optional) ───────────────────────────────

if [[ $DO_HYPR -eq 1 ]] && [[ -f "$HYPR_CONFIG" ]]; then
  if grep -q "exec-once = ags run $SCRIPT_DIR" "$HYPR_CONFIG"; then
    info "Hyprland autostart already present"
  else
    step "adding Hyprland autostart to $HYPR_CONFIG"
    run "echo 'exec-once = ags run $SCRIPT_DIR' >> '$HYPR_CONFIG'"
  fi
elif [[ $DO_HYPR -eq 1 ]]; then
  info "no Hyprland config at $HYPR_CONFIG — skipping autostart"
fi

# ─── 5. done ────────────────────────────────────────────────────────

echo
step "installed. next:"
info "  ags run $SCRIPT_DIR       # launch now"
info "  ags bundle $SCRIPT_DIR    # produce a standalone binary"
info "  $EDITOR $CONFIG_DIR/config.yaml  # customize (live-reloaded)"
