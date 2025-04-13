# Pokemon Card Tracker - Production Deployment Guide

This guide provides steps for deploying the Pokemon Card Tracker application to a production environment.

## Prerequisites

1. A web server running Linux (Ubuntu 20.04+ recommended)
2. NGINX installed
3. Node.js 16+ installed
4. A domain name with DNS configured to point to your server
5. SSL certificate (Let's Encrypt recommended)

## Step 1: Prepare the Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages if not already installed
sudo apt install -y nginx certbot python3-certbot-nginx

# Create a user for running the application
sudo useradd -m -s /bin/bash webuser

# Create the application directory
sudo mkdir -p /var/www/mycardtracker
sudo chown webuser:webuser /var/www/mycardtracker
```

## Step 2: Build and Deploy the Application

On your development machine:

1. Run the deployment script:
```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

2. Transfer the dist folder to your server:
```bash
scp -r dist/* webuser@your-server-ip:/var/www/mycardtracker/
```

3. Prepare Firebase credentials (on the server):
```bash
# Upload your Firebase service account key to the server
scp firebase-credentials.json webuser@your-server-ip:/var/www/mycardtracker/dist/api/

# Make sure file permissions are set correctly
ssh webuser@your-server-ip "chmod 600 /var/www/mycardtracker/dist/api/firebase-credentials.json"
```

## Step 3: Configure NGINX

1. Copy the NGINX configuration to your server:
```bash
scp nginx.conf webuser@your-server-ip:/tmp/mycardtracker
sudo mv /tmp/mycardtracker /etc/nginx/sites-available/mycardtracker
sudo ln -s /etc/nginx/sites-available/mycardtracker /etc/nginx/sites-enabled/
```

2. Obtain SSL certificate:
```bash
sudo certbot --nginx -d www.mycardtracker.com.au -d mycardtracker.com.au
```

3. Test and reload NGINX:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 4: Set Up the API Server

1. Install dependencies:
```bash
ssh webuser@your-server-ip "cd /var/www/mycardtracker/api && npm install --production"
```

2. Set up systemd service:
```bash
scp mycardtracker-api.service webuser@your-server-ip:/tmp/
sudo mv /tmp/mycardtracker-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mycardtracker-api
sudo systemctl start mycardtracker-api
```

3. Check the service status:
```bash
sudo systemctl status mycardtracker-api
```

## Step 5: Monitor and Troubleshoot

### View API logs
```bash
sudo journalctl -u mycardtracker-api -f
```

### Check NGINX logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart services if needed
```bash
sudo systemctl restart mycardtracker-api
sudo systemctl reload nginx
```

## Moving to Cloud Hosting (Alternative)

For easier scalability and management, consider using cloud services:

1. Frontend: Deploy to Vercel, Netlify, or Firebase Hosting
2. API Server: Deploy to Heroku, Railway, or Google Cloud Run
3. Database: Use Firebase or MongoDB Atlas for cloud database

Follow the specific deployment guides for each platform. 