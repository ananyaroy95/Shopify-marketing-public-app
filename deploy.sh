#!/bin/bash

echo "Pull latest code..."
git pull origin main

echo "Installing packages..."
npm install

echo "Generating Prisma..."
npx prisma generate

echo "Updating database..."
npx prisma db push

echo "Building project..."
npm run build

echo "Restarting PM2..."
pm2 restart adbuffs-app

echo "Saving PM2..."
pm2 save

echo "Deployment completed."