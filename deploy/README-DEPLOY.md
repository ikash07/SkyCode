# SkyCode Deployment Guide — 100% Free Hosting

**Architecture:**
```
GitHub → Netlify (Frontend) → HTTPS → Oracle Cloud VM (Backend + Code Execution) → MongoDB Atlas (Database)
```

**Cost: $0/month** using free tiers of all three services.

---

## STEP 1: Create MongoDB Atlas Free Database

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and create a free account
2. Create a **Free Shared Cluster** (M0 — 512 MB)
3. Under **Database Access**, create a database user:
   - Username: `skycode_user`
   - Password: (generate a strong password, save it)
   - Role: **Read and Write to Any Database**
4. Under **Network Access**, click **Add IP Address**:
   - Click **"Allow Access from Anywhere"** (`0.0.0.0/0`)
   - This is required so your Oracle VM can connect
5. Click **Connect** → **Drivers** → Copy the connection string:
   ```
   mongodb+srv://skycode_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/online_ide?retryWrites=true&w=majority
   ```

---

## STEP 2: Create Oracle Cloud Always Free VM

1. Go to [https://cloud.oracle.com](https://cloud.oracle.com) and create a free account
2. Go to **Compute** → **Instances** → **Create Instance**
3. Configure:
   - **Image**: Ubuntu 22.04 or 24.04
   - **Shape**: VM.Standard.A1.Flex (ARM — Always Free)
   - **OCPU**: 1-4 (free up to 4)
   - **RAM**: 6-24 GB (free up to 24 GB)
   - **Boot Volume**: 50 GB (free up to 200 GB)
4. Download your SSH private key (`.key` file)
5. Note the **Public IP Address** after instance is created

### Open Firewall Ports in Oracle Cloud Console

> **Important:** Oracle Cloud has TWO firewalls — the cloud console AND the VM's iptables. You must open ports in BOTH.

1. Go to **Networking** → **Virtual Cloud Networks** → Your VCN → **Subnets** → Your Subnet → **Security Lists**
2. Add **Ingress Rules**:

| Source CIDR    | Protocol | Dest Port | Description |
|---------------|----------|-----------|-------------|
| `0.0.0.0/0`  | TCP      | 80        | HTTP        |
| `0.0.0.0/0`  | TCP      | 443       | HTTPS       |

> Port 22 (SSH) should already be open by default.
> Do NOT open port 4000 — Nginx will handle proxying.

---

## STEP 3: SSH into VM & Install Software

```bash
# Connect to your VM (replace with your key and IP)
ssh -i ~/your-key.key ubuntu@YOUR_VM_PUBLIC_IP
```

### Option A: Automated Setup (recommended)
```bash
# Upload and run the setup script
curl -O https://raw.githubusercontent.com/ikash07/SkyCode/main/deploy/setup-server.sh
bash setup-server.sh
```

### Option B: Manual Setup
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install compilers
sudo apt-get install -y build-essential gcc g++ python3 python3-pip default-jdk git

# Install Docker
sudo apt-get install -y ca-certificates gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
sudo usermod -aG docker $USER

# Pre-pull execution images
sudo docker pull python:3.12-slim
sudo docker pull gcc:14-bookworm
sudo docker pull eclipse-temurin:21-jdk

# Install Nginx
sudo apt-get install -y nginx
sudo systemctl enable nginx

# Install PM2
sudo npm install -g pm2

# Create directories
mkdir -p ~/logs ~/SkyCode
```

**Log out and log back in** for Docker group to take effect:
```bash
exit
ssh -i ~/your-key.key ubuntu@YOUR_VM_PUBLIC_IP
```

---

## STEP 4: Clone SkyCode from GitHub

```bash
cd ~/SkyCode
git clone https://github.com/ikash07/SkyCode.git .
```

---

## STEP 5: Configure Backend Environment

```bash
cd ~/SkyCode/backend
cp .env.example .env
nano .env
```

Set these values in the `.env` file:
```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://skycode_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/online_ide?retryWrites=true&w=majority
JWT_SECRET=GENERATE_A_RANDOM_64_CHAR_STRING_HERE
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=https://YOUR-APP-NAME.netlify.app
DOCKER_EXECUTION_TIMEOUT_SECONDS=12
DOCKER_EXECUTION_MEMORY_MB=512
DOCKER_EXECUTION_CPU_QUOTA=1
```

> **Generate JWT_SECRET:** Run this command to generate a random string:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

> **CLIENT_ORIGIN:** You'll update this after deploying the frontend to Netlify (Step 10).

---

## STEP 6: Install Backend Dependencies

```bash
cd ~/SkyCode/backend
npm install --omit=dev
```

---

## STEP 7: Start Backend with PM2

```bash
cd ~/SkyCode

# Start the backend
pm2 start deploy/ecosystem.config.cjs

# Check it's running
pm2 status
pm2 logs skycode-backend --lines 20

# Save PM2 process list (survives reboots)
pm2 save

# Setup PM2 to start on boot
pm2 startup
# (Run the command PM2 outputs)
```

### Useful PM2 Commands
```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart skycode-backend  # Restart after code changes
pm2 stop skycode-backend     # Stop
pm2 delete skycode-backend   # Remove
```

---

## STEP 8: Configure Nginx

```bash
# Copy the Nginx config
sudo cp ~/SkyCode/deploy/nginx-skycode.conf /etc/nginx/sites-available/skycode

# Enable the site
sudo ln -sf /etc/nginx/sites-available/skycode /etc/nginx/sites-enabled/skycode

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Test it works
```bash
# From your local machine or browser:
curl http://YOUR_VM_PUBLIC_IP/api/health
# Should return: {"ok":true,"service":"online-ide-backend","database":"connected"}
```

---

## STEP 9: Configure HTTPS (Optional — Required for Custom Domain)

### If you have a domain:

1. Point your domain's DNS A record to your Oracle VM's public IP:
   ```
   api.yourdomain.com → YOUR_VM_PUBLIC_IP
   ```

2. Install Certbot and get a free SSL certificate:
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

3. Certbot will automatically update your Nginx config for HTTPS.

4. Verify auto-renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

### If you DON'T have a domain:

You can use the Oracle VM public IP directly. The backend will work over HTTP (`http://YOUR_VM_IP`).

> **Note:** Without HTTPS, the cross-origin cookies (`sameSite: 'none'` + `secure: true`) will NOT work because browsers require `secure` cookies to be sent only over HTTPS. 
>
> **Workaround options:**
> 1. **Get a free domain** from [Freenom](https://www.freenom.com) or use [DuckDNS](https://www.duckdns.org) (free dynamic DNS) + Certbot
> 2. **Use nip.io**: Use `YOUR_IP.nip.io` as a domain → then get HTTPS via Certbot:
>    ```bash
>    sudo certbot --nginx -d YOUR_VM_IP.nip.io
>    ```

---

## STEP 10: Deploy Frontend to Netlify

1. Go to [https://app.netlify.com](https://app.netlify.com) and sign in with GitHub
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **GitHub** and choose your **SkyCode** repository
4. Netlify will automatically detect settings from `netlify.toml`:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Click **"Deploy site"**

---

## STEP 11: Set Frontend Environment Variable

1. In Netlify dashboard, go to **Site configuration** → **Environment variables**
2. Add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://api.yourdomain.com/api` (or `http://YOUR_VM_IP/api`) |

> **Note:** Include `/api` at the end of the URL!

3. Go to **Deploys** → **Trigger deploy** → **Clear cache and deploy site**

---

## STEP 12: Update Backend CLIENT_ORIGIN

After Netlify gives you your site URL (e.g., `https://skycode-ide.netlify.app`):

```bash
# SSH into your Oracle VM
ssh -i ~/your-key.key ubuntu@YOUR_VM_PUBLIC_IP

# Edit the backend .env
nano ~/SkyCode/backend/.env
```

Update `CLIENT_ORIGIN`:
```env
CLIENT_ORIGIN=https://skycode-ide.netlify.app
```

Restart the backend:
```bash
pm2 restart skycode-backend
```

---

## STEP 13: Test the Complete Application

Open your Netlify URL in a browser and test:

- [ ] Frontend loads
- [ ] Register a new account
- [ ] Login
- [ ] Create a project (Python, C, Java)
- [ ] Write code in the editor
- [ ] Save files
- [ ] Run code (terminal output)
- [ ] Interactive terminal (stdin input)
- [ ] Delete project
- [ ] Logout

---

## Troubleshooting

### Backend won't connect to MongoDB
```bash
# Check logs
pm2 logs skycode-backend

# Test MongoDB connection
node -e "
const mongoose = require('mongoose');
mongoose.connect('YOUR_MONGODB_URI')
  .then(() => console.log('Connected!'))
  .catch(e => console.error(e.message));
"
```

### CORS errors in browser console
- Make sure `CLIENT_ORIGIN` in backend `.env` exactly matches your Netlify URL (no trailing slash)
- Restart backend: `pm2 restart skycode-backend`

### WebSocket terminal not connecting
- Make sure Nginx config has `proxy_set_header Upgrade` and `Connection "upgrade"` directives
- Check: `sudo nginx -t && sudo systemctl reload nginx`

### Docker execution fails
```bash
# Check Docker is running
docker ps
docker info

# Test manually
docker run --rm python:3.12-slim python3 -c "print('Hello')"
docker run --rm gcc:14-bookworm gcc --version
docker run --rm eclipse-temurin:21-jdk java --version
```

### Code changes not reflecting on Netlify
- Netlify auto-deploys on git push to main branch
- Or manually: Netlify dashboard → Deploys → Trigger deploy

### Updating the backend after code changes
```bash
cd ~/SkyCode
git pull origin main
cd backend && npm install --omit=dev
pm2 restart skycode-backend
```

---

## Architecture Diagram

```
┌─────────────────┐         ┌──────────────────────────────────────────┐
│                 │  HTTPS  │         Oracle Cloud VM (Free)           │
│   Netlify       │────────►│                                          │
│   (Frontend)    │         │  ┌─────────┐    ┌────────────────────┐  │
│                 │         │  │  Nginx   │───►│  Node.js Backend   │  │
│  React + Vite   │         │  │  :80/443 │    │  (PM2) :4000       │  │
│  Static Files   │         │  └─────────┘    │                    │  │
│                 │         │                  │  ┌──────────────┐  │  │
└─────────────────┘         │                  │  │ Docker       │  │  │
                            │                  │  │ Containers   │  │  │
┌─────────────────┐         │                  │  │ • Python     │  │  │
│  MongoDB Atlas  │◄────────│                  │  │ • GCC (C)    │  │  │
│  (Free M0)      │         │                  │  │ • Java JDK   │  │  │
│  512 MB         │         │                  │  └──────────────┘  │  │
└─────────────────┘         │                  └────────────────────┘  │
                            └──────────────────────────────────────────┘
```

---

## Security Notes

1. **Docker Sandbox**: Code execution uses Docker containers with:
   - Network disabled (`--network none`)
   - All capabilities dropped (`--cap-drop ALL`)
   - Read-only filesystem (`--read-only`)
   - Memory limits (`--memory`)
   - CPU limits (`--cpus`)
   - PID limits (`--pids-limit 128`)
   - Non-root user (`--user 1000:1000`)
   - Execution timeout

2. **Local Fallback**: If Docker is unavailable, code runs via `child_process.spawn()` directly on the host. This has NO sandboxing — make sure Docker is always running in production.

3. **Never commit** `.env` files — they contain secrets.

4. **JWT Secret**: Use a long random string (64+ chars) in production.
