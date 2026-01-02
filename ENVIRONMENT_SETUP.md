# 🌍 Environment Variables Setup Guide

## 📋 Overview

This guide explains how to set up environment variables for **local development** and **production deployment**.

## 🔧 Local Development Setup

### Step 1: Create `.env.local` file

In the `admin` folder, create a file named `.env.local`:

```bash
cd admin
touch .env.local
```

### Step 2: Add your local API URL

Open `.env.local` and add:

```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

**Important:**
- ✅ No semicolon at the end
- ✅ No trailing spaces
- ✅ No quotes around the value
- ✅ Use `http://localhost:4000` (without trailing slash)

### Step 3: Restart your dev server

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

## 🚀 Production Deployment Setup

### Option 1: Vercel

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add:
   - **Name:** `NEXT_PUBLIC_API_BASE`
   - **Value:** `https://d-kjyc.onrender.com` (or your production URL)
   - **Environment:** Production, Preview, Development (select all)
4. Redeploy your application

### Option 2: Netlify

1. Go to **Site Settings** > **Environment Variables**
2. Click **Add variable**
3. Add:
   - **Key:** `NEXT_PUBLIC_API_BASE`
   - **Value:** `https://d-kjyc.onrender.com`
4. Save and redeploy

### Option 3: Render

1. Go to your service settings
2. Navigate to **Environment** tab
3. Add:
   - **Key:** `NEXT_PUBLIC_API_BASE`
   - **Value:** `https://d-kjyc.onrender.com`
4. Save and redeploy

### Option 4: Other Platforms

Check your platform's documentation for setting environment variables. The variable name is:
```
NEXT_PUBLIC_API_BASE
```

## 📁 File Structure

```
admin/
├── .env.local              # Local development (gitignored)
├── .env.example            # Example file (can commit)
├── .env.local.example      # Local example (can commit)
├── .env.production.example # Production example (can commit)
└── .gitignore             # Already ignores .env* files
```

## ✅ Verification

### Check if environment variable is loaded:

1. Open browser console
2. Type: `console.log(process.env.NEXT_PUBLIC_API_BASE)`
3. You should see your API URL (without semicolons or extra characters)

### Test the API connection:

1. Try logging in or signing up
2. Check browser console for any URL errors
3. The URL should be: `http://localhost:4000/api/users/login` (no semicolons)

## 🐛 Troubleshooting

### Issue: URL has semicolon (`http://localhost:4000;`)

**Solution:**
1. Check your `.env.local` file
2. Remove any semicolons from the end
3. Remove trailing spaces
4. Restart the dev server

### Issue: `API_BASE is not configured`

**Solution:**
1. Create `.env.local` file in the `admin` folder
2. Add `NEXT_PUBLIC_API_BASE=http://localhost:4000`
3. Restart the dev server

### Issue: Production URL not working

**Solution:**
1. Verify environment variable is set in your deployment platform
2. Check the variable name is exactly: `NEXT_PUBLIC_API_BASE`
3. Ensure no semicolons or extra characters
4. Redeploy your application

## 📝 Quick Reference

### Local Development:
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

### Production:
```env
NEXT_PUBLIC_API_BASE=https://d-kjyc.onrender.com
```

## 🔒 Security Notes

- ✅ `.env.local` is already in `.gitignore` (won't be committed)
- ✅ Never commit `.env.local` with real credentials
- ✅ Use environment variables in deployment platforms (not hardcoded values)
- ✅ Different URLs for dev/prod are automatically handled

