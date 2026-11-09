#!/usr/bin/env bash
# ParaRota — UFW firewall (Ubuntu 24.04, Oracle image iptables tuzağı çözümlü)
# VM'de çalıştır:  sudo bash 30-firewall.sh
#
# GÜVENLİK AĞI: Script, 5 dakika içinde /tmp/fw_ok dosyası oluşmazsa firewall'ı
# otomatik geri alır (kilitlenmeye karşı). Bağlantının sağlam olduğunu doğrulayınca
# BAŞKA bir terminalden:  sudo touch /tmp/fw_ok   yaz.
set -euo pipefail

echo "==> Mevcut iptables yedeği (/root/iptables.backup)"
iptables-save > /root/iptables.backup 2>/dev/null || true

echo "==> Otomatik geri-alma bekçisi (5 dk)"
rm -f /tmp/fw_ok
nohup bash -c '
  sleep 300
  if [ ! -f /tmp/fw_ok ]; then
    ufw --force disable
    iptables-restore < /root/iptables.backup 2>/dev/null || true
    logger "ParaRota: firewall onaylanmadı, otomatik geri alındı"
  fi
' >/dev/null 2>&1 &

echo "==> UFW kuralları"
export DEBIAN_FRONTEND=noninteractive
apt-get install -y ufw >/dev/null 2>&1 || true
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp  comment 'SSH'
ufw allow 80/tcp  comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

echo "==> Oracle image'ın legacy iptables REJECT kuralını etkisizleştir"
# OCI Ubuntu, 80/443'ü host seviyesinde bloklayan kalıcı kurallarla gelir.
# UFW'yi tek otorite yapıyoruz: legacy kalıcı kuralları kaldır.
if [ -f /etc/iptables/rules.v4 ]; then
  mv /etc/iptables/rules.v4 /root/oracle-rules.v4.bak
fi
if [ -f /etc/iptables/rules.v6 ]; then
  mv /etc/iptables/rules.v6 /root/oracle-rules.v6.bak
fi
# Çalışan zincirdeki REJECT'leri temizle, UFW'yi yeniden yükle
netfilter-persistent flush 2>/dev/null || true
ufw reload

echo ""
echo "✅ UFW aktif:"
ufw status verbose
echo ""
echo "⚠️  ŞİMDİ BAŞKA TERMINALDEN bağlanabildiğini doğrula, sonra:  sudo touch /tmp/fw_ok"
echo "    (5 dk içinde yapmazsan firewall otomatik geri alınır.)"
