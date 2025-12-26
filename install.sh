set -e

REPO="EngramAI-io/Core"
BINARY_NAME="sentinel"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux) OS="unknown-linux-musl" ;;
  Darwin) OS="apple-darwin" ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

case "$ARCH" in
  x86_64) ARCH="x86_64" ;;
  arm64|aarch64) ARCH="aarch64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

TARGET="$ARCH-$OS"
ARCHIVE="$BINARY_NAME-$TARGET.tar.gz"
URL="https://github.com/$REPO/releases/latest/download/$ARCHIVE"

echo "Installing Sentinel ($TARGET)…"
echo "Downloading $URL"

TMP_DIR="$(mktemp -d)"
cd "$TMP_DIR"

curl -fsSL "$URL" -o "$ARCHIVE"
tar -xzf "$ARCHIVE"

chmod +x "$BINARY_NAME"

INSTALL_DIR="/usr/local/bin"
if [ ! -w "$INSTALL_DIR" ]; then
  echo "Requesting sudo permission to install to $INSTALL_DIR"
  sudo mv "$BINARY_NAME" "$INSTALL_DIR/"
else
  mv "$BINARY_NAME" "$INSTALL_DIR/"
fi

echo "Sentinel installed successfully!"
echo "Run: sentinel --help"
