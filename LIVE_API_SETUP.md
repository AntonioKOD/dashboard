# 🌐 WW3 Dashboard - Live API Integration Guide

This guide will help you set up real-time conflict data from multiple sources including ACLED, UCDP, and LiveUAMap.

## 📋 Prerequisites

Before setting up live APIs, ensure you have:
- Node.js 18+ installed
- API keys from the data providers (see below)
- Environment variables configured
- Dashboard running locally

## 🔑 Step 1: Obtain API Keys

### ACLED (Armed Conflict Location & Event Data)
**Best for**: Real-time political violence incidents with precise geolocation

1. **Visit**: [https://acleddata.com/](https://acleddata.com/)
2. **Register**: Create a free account
3. **Apply for API access**: 
   - Go to "Data Export Tool"
   - Request API access (usually approved within 24-48 hours)
4. **Get your key**: Once approved, find your API key in account settings
5. **Rate limits**: 
   - Free tier: 1,000 requests/month
   - Academic: 10,000 requests/month
   - Commercial: Custom limits

### UCDP (Uppsala Conflict Data Program)
**Best for**: Historical conflict data and academic research

1. **Visit**: [https://ucdp.uu.se/](https://ucdp.uu.se/)
2. **API Access**: No registration required for basic access
3. **Enhanced access**: Contact UCDP for higher rate limits
4. **Documentation**: [UCDP API Docs](https://ucdpapi.pcr.uu.se/)
5. **Rate limits**: 
   - Public: 100 requests/hour
   - Academic: 1,000 requests/hour (with registration)

### LiveUAMap
**Best for**: Real-time geospatial conflict feeds

1. **Visit**: [https://liveuamap.com/](https://liveuamap.com/)
2. **Contact**: Email api@liveuamap.com for API access
3. **Commercial license**: Required for most use cases
4. **Rate limits**: Custom based on subscription

## 🛠️ Step 2: Environment Configuration

Create a `.env.local` file in your project root:

```bash
# ACLED Configuration
ACLED_API_KEY=your_acled_api_key_here
ACLED_BASE_URL=https://api.acleddata.com/acled/read

# UCDP Configuration (API key optional for basic access)
UCDP_API_KEY=your_ucdp_api_key_here
UCDP_BASE_URL=https://ucdpapi.pcr.uu.se/api

# LiveUAMap Configuration
LIVEUAMAP_API_KEY=your_liveuamap_api_key_here
LIVEUAMAP_BASE_URL=https://liveuamap.com/api

# Cache and Performance Settings
CACHE_TTL_MINUTES=5
API_RATE_LIMIT_PER_MINUTE=60

# Development Settings
NODE_ENV=development
USE_LIVE_APIS=true
DEBUG=false
```

## 🚀 Step 3: Test API Connections

Run the dashboard with live APIs:

```bash
npm run dev
```

Check the browser console for:
- ✅ Successful API connections
- ❌ Authentication errors
- ⚠️ Rate limiting warnings

## 📊 Step 4: Data Source Configuration

### Configure Individual Sources

The dashboard automatically detects available API keys and enables sources accordingly:

```typescript
// Check which sources are active
import { getConfiguredSources, validateConfig } from './lib/config';

const activeSources = getConfiguredSources();
console.log('Active sources:', activeSources);

const validation = validateConfig();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

### Fallback Behavior

If APIs are unavailable:
1. Dashboard shows "Connecting to live data sources..."
2. Falls back to cached data if available
3. Shows empty state with error message
4. Automatically retries with exponential backoff

## 🔧 Step 5: Advanced Configuration

### Rate Limiting & Performance

```bash
# Adjust these based on your API quotas
API_RATE_LIMIT_PER_MINUTE=30  # Conservative for free tiers
CACHE_TTL_MINUTES=10          # Longer cache for rate-limited APIs
```

### Custom API Endpoints

```bash
# Use custom proxy or regional endpoints
ACLED_BASE_URL=https://your-proxy.com/acled
UCDP_BASE_URL=https://your-proxy.com/ucdp
```

### Development vs Production

```bash
# Development: Use mock data and debug logging
NODE_ENV=development
USE_LIVE_APIS=false
DEBUG=true

# Production: Live APIs with optimized caching
NODE_ENV=production
USE_LIVE_APIS=true
DEBUG=false
CACHE_TTL_MINUTES=15
```

## 📈 Step 6: Monitor API Usage

### Built-in Monitoring

The dashboard includes API monitoring:

```typescript
import { conflictDataAggregator } from './lib/api/aggregator';

// Check source status
const status = conflictDataAggregator.getDataSourceStatus();
console.log('API Status:', status);

// Output example:
// {
//   ACLED: { enabled: true, lastFetch: 1642780800000, errorCount: 0, canFetch: true },
//   UCDP: { enabled: true, lastFetch: 1642780500000, errorCount: 1, canFetch: false },
//   LiveUAMap: { enabled: false, lastFetch: 0, errorCount: 0, canFetch: false }
// }
```

### Error Handling

Common issues and solutions:

| Error | Cause | Solution |
|-------|--------|----------|
| `401 Unauthorized` | Invalid API key | Check `.env.local` configuration |
| `429 Too Many Requests` | Rate limit exceeded | Increase `CACHE_TTL_MINUTES` |
| `CORS Error` | Browser security | Use server-side API routes |
| `Network Error` | API endpoint down | Dashboard will retry automatically |

## 🔒 Step 7: Security Best Practices

### Environment Variables
- Never commit `.env.local` to version control
- Use different keys for development/production
- Rotate API keys regularly

### API Key Management
```bash
# Use a secure secret management service in production
# AWS Secrets Manager, Azure Key Vault, etc.
```

### Rate Limiting
- Monitor your API quotas
- Implement client-side caching
- Use exponential backoff for retries

## 🎯 Step 8: Optimization for Production

### Caching Strategy
```typescript
// Recommended cache times by data source
const cacheConfig = {
  ACLED: 5 * 60 * 1000,     // 5 minutes (high frequency)
  LiveUAMap: 2 * 60 * 1000, // 2 minutes (real-time)
  UCDP: 15 * 60 * 1000      // 15 minutes (slower updates)
};
```

### Load Balancing
- Use multiple API keys if available
- Implement round-robin requests
- Add circuit breakers for failed APIs

### Performance Monitoring
```typescript
// Add performance tracking
const startTime = performance.now();
const events = await conflictDataAggregator.getAllConflictEvents();
const duration = performance.now() - startTime;
console.log(`Data fetch took ${duration}ms`);
```

## 🌍 Live Data Features

Once configured, your dashboard will display:

### Real-time Updates
- ✅ Live conflict events from ACLED
- ✅ Historical trends from UCDP  
- ✅ Breaking incidents from LiveUAMap
- ✅ Automatic threat level calculation
- ✅ Regional analysis and breakdowns

### Enhanced Functionality
- 🔄 Auto-refresh every 5 minutes
- 📊 Real-time metrics calculation
- 🗺️ Live map markers with severity coding
- 🚨 Critical event alerting
- 📈 Historical trend analysis

## 🆘 Troubleshooting

### Common Issues

1. **No data showing**
   ```bash
   # Check API configuration
   npm run dev
   # Look for console errors about missing API keys
   ```

2. **Rate limit errors**
   ```bash
   # Increase cache time
   CACHE_TTL_MINUTES=15
   ```

3. **CORS issues**
   ```bash
   # The dashboard handles CORS automatically
   # If issues persist, check API documentation
   ```

### Debug Mode
```bash
DEBUG=true npm run dev
```

This enables verbose logging for API calls, cache hits/misses, and error details.

## 📞 Support

### API Provider Support
- **ACLED**: support@acleddata.com
- **UCDP**: info@pcr.uu.se  
- **LiveUAMap**: api@liveuamap.com

### Dashboard Support
- Create an issue in the GitHub repository
- Include API configuration (without keys)
- Provide browser console errors

---

## 🎉 Success!

Your WW3 Dashboard is now connected to live conflict data sources. The dashboard will:

- 🔴 Show real-time global conflicts
- 📍 Display precise event locations
- ⚡ Update automatically every 5 minutes
- 🎯 Calculate dynamic threat levels
- 📊 Provide live analytics and trends

**Next Steps:**
- Monitor API usage to stay within quotas
- Set up alerting for critical events
- Customize regional filtering
- Add historical trend analysis 