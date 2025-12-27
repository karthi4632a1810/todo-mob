# Production Deployment Checklist

Use this checklist to ensure your backend is ready for production deployment.

## Pre-Deployment

### Environment Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `NODE_ENV=production` set in `.env`
- [ ] `JWT_SECRET` changed from default (at least 32 characters)
- [ ] `JWT_SECRET` generated using: `openssl rand -base64 32`
- [ ] `MONGODB_URI` configured (production database)
- [ ] `CORS_ORIGIN` set to specific domain(s), not `*`
- [ ] `PORT` configured (default: 3000)

### Security
- [ ] Strong JWT secret (32+ characters, random)
- [ ] CORS restricted to specific domains
- [ ] MongoDB connection uses authentication
- [ ] `.env` file is in `.gitignore` (not committed)
- [ ] All default passwords changed
- [ ] Rate limiting enabled (100 requests/15min in production)
- [ ] Helmet security headers enabled

### Dependencies
- [ ] Removed incorrect dependencies (`async-storage`, `datetimepicker`)
- [ ] All production dependencies installed: `npm install --production`
- [ ] No development dependencies in production
- [ ] Package versions are stable (no `^` or `~` if needed)

### Database
- [ ] MongoDB database created
- [ ] Database user created with proper permissions
- [ ] Connection string tested
- [ ] Network access configured (firewall, IP whitelist)
- [ ] Backup strategy in place
- [ ] Indexes verified (already in models)

### Code Quality
- [ ] All `console.log` statements removed or conditional
- [ ] Error handling improved
- [ ] Input validation on all routes
- [ ] No hardcoded secrets or credentials
- [ ] No localhost URLs in production code

## Deployment

### Server Setup
- [ ] Node.js 14+ installed
- [ ] Server has sufficient resources (CPU, RAM, disk)
- [ ] Firewall configured (only necessary ports open)
- [ ] SSL certificate installed (for HTTPS)
- [ ] Reverse proxy configured (Nginx/Apache)

### Process Management
- [ ] PM2 or similar process manager installed
- [ ] Application starts automatically on server reboot
- [ ] Log rotation configured
- [ ] Monitoring set up

### Testing
- [ ] Health check endpoint works: `/api/health`
- [ ] Authentication endpoints tested
- [ ] All API endpoints tested
- [ ] Database connection tested
- [ ] CORS configuration tested
- [ ] Rate limiting tested

## Post-Deployment

### Monitoring
- [ ] Application logs accessible
- [ ] Error tracking configured (optional: Sentry)
- [ ] Server monitoring set up
- [ ] Database monitoring set up
- [ ] Uptime monitoring configured

### Maintenance
- [ ] Backup schedule configured
- [ ] Update strategy planned
- [ ] Rollback procedure documented
- [ ] Support contact information available

### Documentation
- [ ] API documentation updated
- [ ] Deployment guide reviewed
- [ ] Environment variables documented
- [ ] Troubleshooting guide available

## Verification Commands

```bash
# Check environment variables
node -e "require('dotenv').config(); console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length); console.log('NODE_ENV:', process.env.NODE_ENV);"

# Test database connection
node -e "require('dotenv').config(); const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => { console.log('Connected'); process.exit(0); }).catch(e => { console.error('Failed:', e.message); process.exit(1); });"

# Test server start
NODE_ENV=production npm start

# Health check
curl http://localhost:3000/api/health
```

## Common Issues

### Issue: Server won't start
- **Check**: Environment variables are set
- **Check**: MongoDB connection string is correct
- **Check**: Port is not already in use
- **Check**: All required dependencies installed

### Issue: CORS errors
- **Check**: `CORS_ORIGIN` includes frontend domain
- **Check**: Frontend sends proper headers
- **Check**: No trailing slashes in CORS_ORIGIN

### Issue: Authentication fails
- **Check**: `JWT_SECRET` is set and strong
- **Check**: Token expiration time is appropriate
- **Check**: Frontend sends token in Authorization header

### Issue: Database connection fails
- **Check**: MongoDB is running
- **Check**: Network connectivity
- **Check**: Credentials are correct
- **Check**: IP whitelist includes server IP

## Security Reminders

⚠️ **Never commit `.env` file to version control**
⚠️ **Always use HTTPS in production**
⚠️ **Change all default secrets and passwords**
⚠️ **Restrict CORS to specific domains**
⚠️ **Use strong JWT secrets (32+ characters)**
⚠️ **Enable rate limiting**
⚠️ **Keep dependencies updated**
⚠️ **Monitor for security vulnerabilities**

