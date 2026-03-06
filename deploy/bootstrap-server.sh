#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run this script as root."
  exit 1
fi

USERNAME="weopc"
APP_DIR="/home/${USERNAME}/weopc"
NODE_VERSION="20"

if ! id "$USERNAME" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$USERNAME"
fi

usermod -aG sudo "$USERNAME"
mkdir -p /home/$USERNAME/.ssh
chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh
chmod 700 /home/$USERNAME/.ssh

apt-get update
apt-get install -y curl git build-essential nginx

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker "$USERNAME"

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@8 pm2
else
  npm install -g pm2
fi

mkdir -p "$APP_DIR"
chown -R $USERNAME:$USERNAME "/home/$USERNAME"

echo "Bootstrap complete. Next: switch to user '$USERNAME', clone repo, create .env.production files, and configure nginx."
