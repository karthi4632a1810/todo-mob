# Production Deployment Guide

This guide will help you deploy the Todo Backend API to production.

## Prerequisites

- Node.js 14+ installed
- MongoDB database (local or cloud like MongoDB Atlas)
- Domain name and SSL certificate (for HTTPS)
- Server/hosting provider (AWS, DigitalOcean, Heroku, etc.)

## Step 1: Environment Setup

1. **Create `.env` file** from `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables** in `.env`:

   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=production

   # MongoDB Configuration
   # For MongoDB Atlas (recommended for production):
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todo-app?retryWrites=true&w=majority
   
   # For local MongoDB:
   # MONGODB_URI=mongodb://localhost:27017/todo-app

   # JWT Configuration
   # IMPORTANT: Generate a strong secret:
   # openssl rand -base64 32
   JWT_SECRET=your-strong-random-secret-at-least-32-characters-long
   JWT_EXPIRE=7d

   # CORS Configuration
   # Specify your frontend domain(s), comma-separated:
   CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
   
   # For mobile apps, you may need to allow specific origins or use *
   # (Note: Using * in production is not recommended for web apps)
   ```

## Step 2: Security Checklist

- [ ] **JWT_SECRET**: Changed from default and at least 32 characters
- [ ] **CORS_ORIGIN**: Set to specific domain(s), not `*`
- [ ] **MongoDB**: Using authentication and secure connection
- [ ] **HTTPS**: Server is behind HTTPS (use reverse proxy like Nginx)
- [ ] **Firewall**: Only necessary ports are open
- [ ] **Environment Variables**: `.env` file is not committed to git

## Step 3: Install Dependencies

```bash
npm install --production
```

This installs only production dependencies (excludes devDependencies like nodemon).

## Step 4: Database Setup

1. **Create MongoDB database** (if using MongoDB Atlas):
   - Sign up at https://www.mongodb.com/cloud/atlas
   - Create a cluster
   - Create a database user
   - Whitelist your server IP
   - Get connection string

2. **Run database migrations** (if any):
   - The app uses Mongoose schemas that auto-create collections
   - No manual migration needed

3. **Seed initial data** (optional):
   ```bash
   npm run create-director  # Create director account
   npm run seed-users       # Seed sample users
   npm run seed-tasks       # Seed sample tasks
   ```

## Step 5: Start the Server

### Option A: Direct Start (Simple)

```bash
npm start
```

### Option B: Using PM2 (Recommended for Production)

1. **Install PM2 globally**:
   ```bash
   npm install -g pm2
   ```

2. **Start the application**:
   ```bash
   pm2 start server.js --name todo-api
   ```

3. **Save PM2 configuration**:
   ```bash
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start on reboot
   ```

4. **PM2 Useful Commands**:
   ```bash
   pm2 list              # List all processes
   pm2 logs todo-api     # View logs
   pm2 restart todo-api  # Restart app
   pm2 stop todo-api     # Stop app
   pm2 delete todo-api   # Remove from PM2
   ```

### Option C: Using Docker

1. **Create `Dockerfile`**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Build and run**:
   ```bash
   docker build -t todo-api .
   docker run -d -p 3000:3000 --env-file .env --name todo-api todo-api
   ```

## Step 6: Reverse Proxy (Nginx)

For production, use Nginx as a reverse proxy:

1. **Install Nginx**:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Create Nginx configuration** (`/etc/nginx/sites-available/todo-api`):
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **Enable site and restart Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/todo-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Setup SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

## Step 7: Monitoring & Logging

### PM2 Monitoring

```bash
pm2 monit  # Real-time monitoring
```

### Log Management

- Logs are written to console
- For production, consider:
  - **Winston** for structured logging
  - **Sentry** for error tracking
  - **Log aggregation** services (Loggly, Papertrail)

### Health Check

The API includes a health check endpoint:
```bash
curl https://api.yourdomain.com/api/health
```

## Step 8: Update Mobile App

Update the API URL in your mobile app:
```javascript
// mobile/src/services/api.js
const API_BASE_URL = 'https://api.yourdomain.com/api';
```

## Troubleshooting

### Server won't start
- Check MongoDB connection string
- Verify all environment variables are set
- Check if port 3000 is available
- Review error logs

### Database connection fails
- Verify MongoDB is running
- Check network connectivity
- Verify credentials in MONGODB_URI
- Check firewall rules

### CORS errors
- Verify CORS_ORIGIN includes your frontend domain
- Check if request includes proper headers
- Ensure credentials are handled correctly

### Rate limiting issues
- Adjust rate limit settings in `server.js`
- Consider different limits for different endpoints

## Performance Optimization

1. **Enable MongoDB indexes** (already configured in models)
2. **Use connection pooling** (already configured)
3. **Enable compression** (add `compression` middleware)
4. **Cache frequently accessed data** (consider Redis)
5. **Use CDN** for static assets (if any)

## Backup Strategy

1. **Database backups**:
   - MongoDB Atlas: Automatic backups
   - Local MongoDB: Use `mongodump` regularly

2. **Environment backup**:
   - Keep `.env` file in secure password manager
   - Document all configuration

## Security Best Practices

1. ✅ Use HTTPS (SSL/TLS)
2. ✅ Strong JWT secret (32+ characters)
3. ✅ Restrict CORS to specific domains
4. ✅ Rate limiting enabled
5. ✅ Helmet security headers enabled
6. ✅ Input validation on all routes
7. ✅ Password hashing with bcrypt
8. ✅ Environment variables for secrets
9. ✅ Regular security updates
10. ✅ Monitor for suspicious activity

## Support

For issues or questions:
- Check server logs: `pm2 logs todo-api`
- Review error responses from API
- Check MongoDB connection status
- Verify environment variables

