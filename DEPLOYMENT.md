# Deployment Guide

## Step 1: Environment Setup

### 1.1 Create Environment File
Create a `.env.local` file in your project root with the following content:

```bash
# Supabase Configuration - Production
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Next.js Configuration
NEXTAUTH_URL=https://your-app-domain.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-here
```

### 1.2 Get Supabase Credentials
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### 1.3 Generate NEXTAUTH_SECRET
Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

## Step 2: Deploy to Vercel (Free)

### 2.1 Prepare Your Repository
1. **Commit all your changes** to Git:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2.2 Deploy to Vercel
1. Go to [Vercel](https://vercel.com)
2. **Sign up/Login** with your GitHub account
3. Click **"New Project"**
4. **Import your repository**
5. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

### 2.3 Set Environment Variables in Vercel
1. In your Vercel project dashboard, go to **Settings → Environment Variables**
2. Add these variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key
   - `NEXTAUTH_SECRET` = Your generated secret
   - `NEXTAUTH_URL` = Your Vercel app URL (e.g., `https://your-app.vercel.app`)

### 2.4 Deploy
1. Click **"Deploy"**
2. Wait for the build to complete
3. Your app will be live at `https://your-app.vercel.app`

## Step 3: Database Setup

### 3.1 Run Database Migrations
1. In your Supabase dashboard, go to **SQL Editor**
2. Run the migration from `supabase/migrations/001_initial_schema.sql`

### 3.2 Verify Connection
1. Visit your deployed app
2. Try to create/edit sessions
3. Check Supabase dashboard to see if data is being saved

## Step 4: Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings → Domains**
2. Add your custom domain
3. Update `NEXTAUTH_URL` in environment variables

## Troubleshooting

### Common Issues:

1. **Build Fails**: Check that all dependencies are in `package.json`
2. **Environment Variables Not Working**: Ensure they're set in Vercel dashboard
3. **Database Connection Issues**: Verify Supabase URL and key are correct
4. **CORS Errors**: Supabase handles this automatically for Vercel domains

### Useful Commands:
```bash
# Test build locally
npm run build

# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL

# View Vercel logs
vercel logs
```

## Alternative Free Hosting Options

### Netlify
- Similar to Vercel
- Good for static sites
- Free tier available

### Railway
- Good for full-stack apps
- Free tier available
- Easy database integration

### Render
- Free tier available
- Good for Node.js apps
- Automatic deployments

## Security Notes

1. **Never commit `.env.local`** to Git
2. **Use environment variables** in production
3. **Enable Row Level Security** in Supabase
4. **Set up proper authentication** if needed
5. **Regular backups** of your database

## Cost Breakdown

- **Vercel**: Free tier (100GB bandwidth, 100 serverless function executions)
- **Supabase**: Free tier (500MB database, 50MB file storage, 2GB bandwidth)
- **Total**: $0/month for small to medium usage

## Next Steps

1. **Set up monitoring** (Vercel Analytics)
2. **Configure backups** (Supabase backups)
3. **Set up CI/CD** (automatic deployments)
4. **Add custom domain** (optional)
5. **Set up email notifications** (if needed) 