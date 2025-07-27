# Quick Setup Guide

## 🚀 Immediate Steps to Deploy

### 1. Create Environment File
Create `.env.local` in your project root:

```bash
# Copy your actual values from Supabase Dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXTAUTH_SECRET=your-generated-secret
NEXTAUTH_URL=https://your-app.vercel.app
```

### 2. Get Supabase Credentials
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click your project
3. Go to **Settings → API**
4. Copy **Project URL** and **anon public key**

### 3. Generate Secret
Run this in terminal:
```bash
openssl rand -base64 32
```

### 4. Deploy to Vercel
1. Go to [Vercel](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your repository
5. Add environment variables in Vercel dashboard
6. Deploy!

## 📊 Database Setup

### Run Migration
1. In Supabase Dashboard → SQL Editor
2. Copy and run the content from `supabase/migrations/001_initial_schema.sql`

### Verify Tables
You should see these tables:
- `sessions`
- `stages` 
- `speakers`
- `conference_days`
- `session_types`
- `session_participants`

## 🔧 Test Your Setup

1. **Local Test**: `npm run dev`
2. **Build Test**: `npm run build`
3. **Deploy Test**: Check Vercel deployment
4. **Database Test**: Create/edit sessions in your app

## 🆘 Common Issues

### "Environment variables not found"
- Check `.env.local` exists
- Verify variable names match exactly
- Restart development server

### "Database connection failed"
- Verify Supabase URL and key
- Check if database tables exist
- Ensure RLS policies are set up

### "Build fails on Vercel"
- Check environment variables in Vercel dashboard
- Verify all dependencies in `package.json`
- Check build logs for specific errors

## 📞 Need Help?

1. Check the full `DEPLOYMENT.md` guide
2. Look at Vercel build logs
3. Check Supabase dashboard for errors
4. Verify environment variables are set correctly

## ✅ Success Checklist

- [ ] `.env.local` created with correct values
- [ ] Supabase credentials copied correctly
- [ ] Database migration run successfully
- [ ] Vercel deployment successful
- [ ] Environment variables set in Vercel
- [ ] App loads without errors
- [ ] Can create/edit sessions
- [ ] Data persists after refresh 