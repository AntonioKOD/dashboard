# WW3 Dashboard - Production Deployment Guide

This guide covers deploying the WW3 Dashboard to production with optimal performance, security, and reliability.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- ACLED API key (`vaTMRCy78p8oJa87X*eN`)
- Domain name (optional)
- SSL certificate (for HTTPS)

### Environment Setup

1. **Create production environment file:**
```bash
cp .env.local .env.production
```

2. **Configure environment variables:**
```env
NODE_ENV=production
ACLED_API_KEY=vaTMRCy78p8oJa87X*eN
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Deployment Options

## Option 1: Native Node.js Deployment

### 1. Automated Deployment Script
```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh deploy
```

### 2. Manual Deployment
```bash
# Install production dependencies
npm ci --only=production

# Build for production
npm run build:production

# Start production server
npm run start:production
```

## Option 2: Docker Deployment

### 1. Build and Run with Docker
```bash
# Build the Docker image
docker build -t ww3-dashboard .

# Run the container
docker run -d \
  --name ww3-dashboard \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e ACLED_API_KEY=vaTMRCy78p8oJa87X*eN \
  ww3-dashboard
```

### 2. Docker Compose (Recommended)
```bash
# Start with Docker Compose
docker-compose up -d

# With Nginx reverse proxy
docker-compose --profile with-nginx up -d
```

## Option 3: Cloud Platform Deployment

### Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Other Platforms
- **Railway**: Connect GitHub repo and deploy
- **Render**: Connect GitHub repo and deploy
- **DigitalOcean App Platform**: Use Docker or Node.js buildpack
- **AWS Amplify**: Connect GitHub repo and deploy

## 🔧 Production Configuration

### Next.js Configuration
The `next.config.ts` includes production optimizations:
- Security headers
- Compression enabled
- Source maps disabled
- Console logging removed
- Bundle splitting optimized

### Performance Optimizations
- **Caching**: 5-minute cache for production API calls
- **Compression**: Gzip enabled for all responses
- **Bundle Splitting**: Optimized chunk splitting
- **Image Optimization**: WebP/AVIF formats enabled
- **Package Optimization**: Tree-shaking for smaller bundles

### Security Features
- **CSP Headers**: Content Security Policy configured
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **API Key Protection**: Server-side only access
- **CORS Configuration**: Production domains only
- **Rate Limiting**: Built-in API rate limiting

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl http://localhost:3000/api/health
```

Returns comprehensive health information:
- System status
- Memory usage
- API connectivity
- Performance metrics
- Error statistics

### Monitoring Features
- **Performance Monitoring**: Core Web Vitals tracking
- **Error Tracking**: Comprehensive error logging
- **API Monitoring**: Response times and success rates
- **Memory Monitoring**: Heap usage tracking

## 🚨 Production Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] ACLED API key validated
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Domain DNS configured
- [ ] Backup strategy in place

### Post-Deployment
- [ ] Health check passing
- [ ] All data sources working
- [ ] Performance metrics acceptable
- [ ] Error rates within limits
- [ ] Monitoring alerts configured

### Security Checklist
- [ ] API keys secured (not in client-side code)
- [ ] Security headers configured
- [ ] HTTPS enabled
- [ ] Rate limiting active
- [ ] Error messages don't expose sensitive data

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Clear cache and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. API Connection Issues
```bash
# Test API endpoints
curl http://localhost:3000/api/test-acled
curl http://localhost:3000/api/test-news
```

#### 3. Memory Issues
- Monitor memory usage via health check
- Restart application if memory usage > 90%
- Consider horizontal scaling for high traffic

#### 4. Performance Issues
- Check Core Web Vitals metrics
- Analyze bundle size with `npm run analyze`
- Review slow API calls in logs

### Log Analysis
```bash
# View application logs
tail -f app.log

# View deployment logs
tail -f deployment.log

# Docker logs
docker logs ww3-dashboard
```

## 📈 Scaling & Optimization

### Horizontal Scaling
```bash
# Run multiple instances with load balancer
docker-compose scale ww3-dashboard=3
```

### Database Optimization
- Consider Redis for caching if scaling beyond single instance
- Implement database for persistent storage of events
- Add CDN for static assets

### Performance Tuning
- Enable HTTP/2 if using custom server
- Implement service worker for offline capabilities
- Add database indexes for faster queries
- Use database connection pooling

## 🔄 Maintenance

### Regular Tasks
- **Daily**: Check health status and error logs
- **Weekly**: Review performance metrics and optimize
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and update API keys

### Backup Strategy
- Application code: Git repository
- Configuration: Environment variables backup
- Logs: Automated log rotation and archival
- Data: API cache and user preferences

### Updates
```bash
# Update dependencies
npm update

# Security updates
npm audit fix

# Rebuild and redeploy
npm run deploy
```

## 🆘 Emergency Procedures

### Rollback Deployment
```bash
# Using deployment script
./scripts/deploy.sh rollback

# Manual rollback
docker-compose down
docker-compose up -d
```

### High Memory Usage
```bash
# Restart application
pm2 restart ww3-dashboard
# or
docker-compose restart ww3-dashboard
```

### API Failures
- Check API key validity
- Verify network connectivity
- Review rate limiting status
- Switch to fallback data sources

## 📞 Support

For production issues:
1. Check health endpoint: `/api/health`
2. Review application logs
3. Verify environment configuration
4. Test API connectivity
5. Check system resources

## 🎯 Performance Targets

### Response Times
- **Page Load**: < 2 seconds
- **API Calls**: < 1 second
- **Health Check**: < 500ms

### Reliability
- **Uptime**: 99.9%
- **API Success Rate**: > 95%
- **Error Rate**: < 1%

### Resource Usage
- **Memory**: < 512MB per instance
- **CPU**: < 80% average
- **Disk**: < 1GB storage 