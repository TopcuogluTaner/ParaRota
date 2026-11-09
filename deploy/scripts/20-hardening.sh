#!/usr/bin/env bash
# ParaRota — SSH sertleştirme + fail2ban (Ubuntu 24.04)
# VM'de çalıştır:  sudo bash 20-hardening.sh
# NOT: Anahtar tabanlı giriş zaten çalışıyor olmalı (aksi halde parola kapatınca kilitlenirsin).
set -euo pipefail

echo "==> Anahtar tabanlı giriş kontrolü"
if [ ! -s /home/ubuntu/.ssh/authorized_keys ]; then
  echo "❌ /home/ubuntu/.ssh/authorized_keys boş — parola auth'u KAPATMIYORUM (kilitlenme riski)."
  exit 1
fi

echo "==> SSH hardening (drop-in: 99-pararota.conf)"
cat > /etc/ssh/sshd_config.d/99-pararota.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
EOF

# Config'i doğrula, sonra reload (restart değil — mevcut oturum düşmesin)
sshd -t
systemctl reload ssh || systemctl reload sshd

echo "==> fail2ban"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y fail2ban

cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = 22
EOF

systemctl enable --now fail2ban
systemctl restart fail2ban

echo ""
echo "✅ SSH sertleştirildi (parola+root kapalı, sadece anahtar) ve fail2ban aktif."
fail2ban-client status sshd 2>/dev/null || true
