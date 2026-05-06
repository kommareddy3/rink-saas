# Deploy Frontend to Vercel

## Prerequisites

- GitHub account (free)
- Vercel account (free at vercel.com)
- Your code pushed to GitHub
- Domain `rinkglobal.com` (already bought)

---

## Step 1: Push Code to GitHub

If not already done, push your project to GitHub:

```bash
# Navigate to your project
cd ~/Downloads/rink-saas-v3-ml

# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit - RINK Global Services app"

# Add remote (replace with your repo)
git remote add origin https://github.com/YOUR_USERNAME/rink-global-services.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create Vercel Account

1. Go to **https://vercel.com**
2. Click **Sign Up**
3. Choose **GitHub** for authentication
4. Authorize Vercel to access your GitHub account
5. Create your account

---

## Step 3: Deploy from Vercel Dashboard

### Method A: Using Vercel Dashboard (Easiest)

1. **Log in to Vercel** → https://vercel.com/dashboard
2. Click **"New Project"** button
3. **Select GitHub repository**
   - Search for `rink-global-services` or your repo name
   - Click **"Import"**
4. **Configure Project Settings:**
   - **Project Name:** `rink-global-services` (or any name)
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./client` (⚠️ Important!)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. **Add Environment Variables** (click "Environment Variables"):
   ```
   VITE_API_BASE_URL = https://rinkglobal.com/api
   ```
   (Change to your actual backend URL once deployed)

6. Click **"Deploy"**
7. Wait 2-3 minutes for deployment to complete ✅

### Method B: Using Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Navigate to client folder:**
   ```bash
   cd ~/Downloads/rink-global-services/client
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Answer the prompts:**
   - Confirm project name
   - Link to GitHub repo (if first time)
   - Select framework: `Vite`
   - Confirm settings

5. ✅ Deployment complete! You'll get a URL like `https://rink-global-services.vercel.app`

---

## Step 4: Connect Custom Domain (rinkglobal.com)

After your project is deployed on Vercel:

### In Vercel Dashboard:

1. Go to your project → **Settings** tab
2. Click **"Domains"** in the left sidebar
3. Enter domain: `rinkglobal.com`
4. Click **"Add"**
5. Vercel will show you **nameservers** to add:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ns3.vercel-dns.com
   ns4.vercel-dns.com
   ```

### In Your Domain Registrar (where you bought the domain):

1. Go to your registrar (GoDaddy, Namecheap, Route 53, etc.)
2. Find **DNS Settings** or **Nameservers**
3. Replace current nameservers with Vercel's 4 nameservers above
4. **Save changes** (may take 24-48 hours to propagate)
5. Once DNS updates, Vercel will automatically issue an SSL certificate

### Add www subdomain:

1. In Vercel **Domains**, also add `www.rinkglobal.com`
2. Vercel will redirect it to main domain automatically

---

## Step 5: Configure for Your Backend

After frontend is live on Vercel, update your environment:

### Option A: Update in Vercel Dashboard

1. Go to project → **Settings** → **Environment Variables**
2. Update `VITE_API_BASE_URL`:
   ```
   VITE_API_BASE_URL = https://rinkglobal.com/api
   ```
   (Or wherever your backend is deployed)
3. Click **"Save"**
4. Trigger a **redeploy**:
   - Go to **Deployments** tab
   - Click **...** on latest deployment
   - Select **"Redeploy"**

### Option B: Use .env.local locally

For local development:
```bash
cd client
echo "VITE_API_BASE_URL=http://localhost:5001" > .env.local
npm run dev
```

For production, Vercel reads from `vercel.json` environment variables.

---

## Step 6: Test Your Deployment

After deployment completes:

```bash
# Test frontend loads
curl https://rinkglobal.com

# Check if API calls work (from browser console)
# Should see requests to https://rinkglobal.com/api/*
```

In your browser:
1. Go to **https://rinkglobal.com**
2. Open **DevTools** (F12) → **Network** tab
3. Trigger a login or API call
4. Check if requests go to correct backend URL

---

## Common Issues & Solutions

### Issue: "Root directory not found"
**Solution:** Make sure you set Root Directory to `./client` in deployment settings

### Issue: "Build fails - dependencies not found"
**Solution:** Make sure `client/package.json` has all dependencies:
```bash
cd client
npm install  # Reinstall to update package-lock.json
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Issue: API calls still go to localhost
**Solution:** 
- Check that `VITE_API_BASE_URL` is set in Vercel environment variables
- Verify `client/src/config.js` is reading from `process.env.VITE_API_BASE_URL`
- Trigger a redeploy after updating env vars

### Issue: Domain shows "CNAME conflict" or not resolving
**Solution:** 
- Wait 24-48 hours for DNS propagation
- Verify you updated nameservers correctly in registrar
- Clear browser cache (Ctrl+Shift+Del)
- Use online DNS checker: https://www.whatsmydns.net/

### Issue: "SSL certificate not issued yet"
**Solution:** Wait a few minutes, Vercel auto-generates them. Refresh dashboard.

---

## Monitoring & Analytics

After deployment, Vercel provides:

- **Performance Analytics** → Measure page load times
- **Function Logs** → Debug API routes
- **Deployments** → See all versions deployed
- **Usage** → Track bandwidth and requests

Access via **Project Settings** → **Analytics**

---

## Auto-Deployments

By default, Vercel auto-deploys when you push to GitHub:

- Push to `main` branch → Auto-deploys to production
- Create PR → Auto-deploys preview URL for testing
- Merge PR → Auto-deploys to production

To disable, go to **Settings** → **Git** → Toggle **"Automatic Deployments"**

---

## Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Root Directory set to `./client`
- [ ] Environment variable `VITE_API_BASE_URL` set
- [ ] First deployment successful (vercel.app URL works)
- [ ] Custom domain added (rinkglobal.com)
- [ ] Nameservers updated in registrar
- [ ] SSL certificate issued (green lock ✅)
- [ ] API calls tested and working
- [ ] Performance acceptable

---

## Next Steps

1. **Deploy Backend** separately (Railway/Heroku)
   See `DEPLOYMENT_GUIDE.md` for backend setup

2. **Setup CI/CD** if needed
   ```bash
   # Vercel automatically watches GitHub for changes
   # No extra setup needed!
   ```

3. **Monitor & Optimize**
   - Use Vercel Analytics to track performance
   - Optimize images in `client/src/assets`
   - Enable Edge Caching for static assets

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Vite Deployment:** https://vitejs.dev/guide/static-deploy.html#vercel
- **Troubleshooting:** https://vercel.com/support

That's it! Your frontend is now live on Vercel with auto-deployments. 🚀
