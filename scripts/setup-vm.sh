#!/usr/bin/env bash
set -euo pipefail
if [[ "$EUID" != 0 ]]; then echo 'Run using sudo bash scripts/setup-vm.sh'; exit 1; fi
apt-get update
apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
mkdir -p /opt/tatsung-marble
if [[ -n "${SUDO_USER:-}" ]]; then usermod -aG docker "$SUDO_USER"; chown "$SUDO_USER":"$SUDO_USER" /opt/tatsung-marble; fi
echo 'Docker installed. Log out/in to refresh group membership.'
