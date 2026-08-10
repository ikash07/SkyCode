#!/bin/bash
# ──────────────────────────────────────────────────────────────
# SkyCode Server Setup Script — Oracle Cloud Ubuntu ARM64
# ──────────────────────────────────────────────────────────────
#
# This script installs all required software on a fresh
# Oracle Cloud Always Free Ubuntu ARM64 (Ampere A1) VM.
#
# USAGE:
#   1. SSH into your Oracle VM
#   2. Run: bash setup-server.sh
#
# The script will ask for confirmation before each major step.
# ──────────────────────────────────────────────────────────────

set -e

echo "============================================"
echo "  SkyCode Server Setup — Oracle Cloud ARM64"
echo "============================================"
echo ""

# ─── 1. System Update ───
echo ">>> Step 1: Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# ─── 2. Install Node.js 22 LTS ───
echo ""
echo ">>> Step 2: Installing Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# ─── 3. Install Build Tools & Compilers ───
echo ""
echo ">>> Step 3: Installing compilers (GCC, Python3, Java JDK)..."
sudo apt-get install -y \
  build-essential \
  gcc \
  g++ \
  python3 \
  python3-pip \
  default-jdk \
  git \
  curl \
  wget \
  unzip

echo "GCC version: $(gcc --version | head -1)"
echo "Python version: $(python3 --version)"
echo "Java version: $(java --version 2>&1 | head -1)"
echo "javac version: $(javac --version 2>&1 | head -1)"

# ─── 4. Install Docker ───
echo ""
echo ">>> Step 4: Installing Docker..."
sudo apt-get install -y ca-certificates gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin

# Add current user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker $USER
echo "Docker version: $(docker --version)"

# ─── 5. Pre-pull Docker execution images ───
echo ""
echo ">>> Step 5: Pre-pulling Docker images for code execution..."
echo "    (This may take 5-10 minutes on first run)"
sudo docker pull python:3.12-slim
sudo docker pull gcc:14-bookworm
sudo docker pull eclipse-temurin:21-jdk
echo "Docker images pulled successfully!"

# ─── 6. Install Nginx ───
echo ""
echo ">>> Step 6: Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
echo "Nginx version: $(nginx -v 2>&1)"

# ─── 7. Install PM2 ───
echo ""
echo ">>> Step 7: Installing PM2 globally..."
sudo npm install -g pm2
echo "PM2 version: $(pm2 --version)"

# ─── 8. Create directories ───
echo ""
echo ">>> Step 8: Creating required directories..."
mkdir -p ~/logs
mkdir -p ~/SkyCode

# ─── 9. Configure iptables firewall ───
echo ""
echo ">>> Step 9: Configuring iptables firewall..."
echo "    Allowing: SSH (22), HTTP (80), HTTPS (443)"
echo "    Blocking direct access to Node.js port (4000)"

# Allow established connections
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT
# Allow SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
# Allow HTTP
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
# Allow HTTPS
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save iptables rules to persist across reboots
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save

echo ""
echo "============================================"
echo "  ✅ Server setup complete!"
echo "============================================"
echo ""
echo "NEXT STEPS:"
echo "  1. Log out and log back in (for docker group to take effect)"
echo "  2. Clone your repo:  cd ~/SkyCode && git clone https://github.com/ikash07/SkyCode.git ."
echo "  3. Create backend/.env with your production values"
echo "  4. Install deps:  cd backend && npm install"
echo "  5. Start with PM2:  pm2 start deploy/ecosystem.config.cjs"
echo "  6. Setup Nginx:  See deploy/nginx-skycode.conf"
echo ""
echo "For the full guide, see deploy/README-DEPLOY.md"
echo ""
