# Deployment Guide for rinkglobal.com

## Architecture Options

You have 3 ways to deploy your RINK Global Services app:

### Option 1: **Single Domain (Recommended for starting)**
- Frontend + Backend both on `rinkglobal.com`
- Frontend served from root `/`
- Backend API served from `/api` prefix
- Simpler DNS setup, easier CORS handling

### Option 2: **Subdomain Split**
- Frontend on `rinkglobal.com`
- Backend API on `api.rinkglobal.com`
- More scalable, separate backend scaling

### Option 3: **Separate Services**
- Frontend on `rinkglobal.com` (Vercel/Netlify)
- Backend on separate service (Heroku/Railway/DigitalOcean)
- Most flexible but requires CORS configuration

---

## Step-by-Step Setup (Option 1 - Single Domain)

### 1. **Update Client Configuration**

Create `.env.local` in `client/`:
```bash
VITE_API_BASE_URL=https://rinkglobal.com/api
```

Or update production build:
```bash
cd client
npm run build  # Creates optimized dist/
```

### 2. **Configure Backend**

Update `server/.env`:
```bash
GROQ_API_KEY=your_actual_key
NODE_ENV=production
PORT=5001
```

Ensure your backend will accept requests to `/api/*` routes.

### 3. **DNS Configuration**

In your domain registrar (where you bought rinkglobal.com):

| Type  | Name                | Value                    |
|-------|---------------------|--------------------------|
| A     | rinkglobal.com      | Your_Server_IP_Address   |
| A     | www                 | Your_Server_IP_Address   |
| CNAME | api                 | rinkglobal.com           |

### 4. **Server Setup (Choose hosting platform)**

#### **Option A: Vercel/Netlify (Frontend) + Heroku/Railway (Backend)**
- **Frontend:** Deploy `client/dist/` to Vercel/Netlify
  ```bash
  npm install -g vercel
  cd client
  vercel --prod
  ```
- **Backend:** Deploy to Railway/Heroku
  ```bash
  # Railway recommended
  # Connect your GitHub repo and deploy
  ```
- Update `.env.local` with backend URL

#### **Option B: Single VPS (DigitalOcean/Linode/AWS)**

**Install Node.js and PM2:**
```bash
sudo apt update && sudo apt install nodejs npm
sudo npm install -g pm2
```

**Clone your repo:**
```bash
git clone <your-repo>
cd rink-global-services
```

**Setup Backend:**
```bash
cd server
npm install
pm2 start server.js --name "rink-global-services" --instances max
pm2 save
pm2 startup
```

**Setup Frontend:**
```bash
cd ../client
npm install
npm run build

# Install Nginx
sudo apt install nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/rinkglobal.com
```

**Nginx Configuration:**
```nginx
upstream backend {
    server localhost:5001;
}

server {
    server_name rinkglobal.com www.rinkglobal.com;
    
    # Serve frontend
    root /path/to/rink-global-services/client/dist;
    index index.html;
    
    # SPA routing - all requests go to index.html
    location / {
        try_files $uri /index.html;
    }
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Other backend endpoints (upload, train, predict, data)
    location /upload {
        proxy_pass http://backend;
    }
    
    location /train {
        proxy_pass http://backend;
    }
    
    location /predict {
        proxy_pass http://backend;
    }
    
    location /data {
        proxy_pass http://backend;
    }
    
    # SSL (after getting certificate)
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/rinkglobal.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rinkglobal.com/privkey.pem;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name rinkglobal.com www.rinkglobal.com;
    return 301 https://$server_name$request_uri;
}
```

**Enable and test:**
```bash
sudo ln -s /etc/nginx/sites-available/rinkglobal.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Get SSL Certificate (Let's Encrypt):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d rinkglobal.com -d www.rinkglobal.com
```

---

## 5. **Testing**

After deployment, test these URLs:

```bash
# Frontend loads
curl https://rinkglobal.com

# Backend responds
curl https://rinkglobal.com/

# API routes work
curl -X POST https://rinkglobal.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

---

## 6. **Environment Variables Needed**

**Server (.env):**
```bash
GROQ_API_KEY=sk-...
NODE_ENV=production
JWT_SECRET=your-secret-key
```

**Client (.env.local or build-time):**
```bash
VITE_API_BASE_URL=https://rinkglobal.com/api
```

---

## Summary of Changes Made

✅ Created `client/src/config.js` - Centralized API configuration
✅ Updated all API calls to use dynamic base URL
✅ Added `.env.example` for reference
✅ Client now auto-detects API from same origin

Now your app will work on:
- Local: `http://localhost:5173` → `http://localhost:5001`
- Production: `https://rinkglobal.com` → `https://rinkglobal.com/api`
