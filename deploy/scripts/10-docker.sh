#!/usr/bin/env bash
# ParaRota — Docker Engine + Compose plugin kurulumu (Ubuntu 24.04 ARM64)
# VM'de çalıştır:  sudo bash 10-docker.sh
set -euo pipefail

echo "==> apt güncelleme"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg

echo "==> Docker resmi GPG anahtarı + repo (arm64)"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

ARCH=$(dpkg --print-architecture)   # arm64
. /etc/os-release
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

echo "==> Docker paketleri"
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> ubuntu kullanıcısını docker grubuna ekle"
usermod -aG docker ubuntu

systemctl enable --now docker

echo ""
echo "✅ Docker kuruldu:"
docker --version
docker compose version
echo "   (ubuntu kullanıcısı için grup değişikliği yeni oturumda geçerli olur)"
