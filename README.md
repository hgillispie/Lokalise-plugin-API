# Lokalise Backend API

Backend API server for the Builder.io Lokalise integration. This server acts as a proxy between Builder.io and Lokalise's API, providing secure, rate-limited access to Lokalise functionality.

## Features

- ✅ **Secure API Proxy** - Handles Lokalise API authentication server-side
- ✅ **Rate Limiting** - Prevents API abuse and respects Lokalise limits  
- ✅ **CORS Security** - Configured for Builder.io domains
- ✅ **Error Handling** - Comprehensive error responses and logging
- ✅ **Railway Ready** - One-click deployment to Railway
- ✅ **Customer Owned** - Easy handover to enterprise customers

## Quick Start

### 1. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Important**: The .env file is primarily for **development and testing**. In production, authentication values come from the Builder.io plugin configuration.

Environment variables:
- `LOKALISE_API_TOKEN` - **Development fallback only** (plugin provides this in production)
- `LOKALISE_PROJECT_ID` - **Development fallback only** (users select projects in plugin)
- `PORT` - Server port (default: 3000)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins

### 2. Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### 3. Railway Deployment

**Option A: Deploy Button**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

**Option B: Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy
railway up
```

## API Endpoints

### Health Check
```http
GET /health
```

### Projects
```http
GET /api/projects                    # Get all projects
GET /api/projects/:projectId         # Get specific project
GET /api/projects/:projectId/contributors  # Get project contributors
```

### Keys
```http
GET /api/keys/:projectId                    # Get all keys
GET /api/keys/:projectId/with-translations  # Get keys with translations
POST /api/keys/:projectId                   # Create new keys
```

### Translations
```http
POST /api/translations/:projectId/fetch    # Fetch translations
POST /api/translations/:projectId/update   # Update translations
```

### Files
```http
POST /api/files/:projectId/upload          # Upload file
POST /api/files/:projectId/download        # Download files
```

### Tasks
```http
GET /api/tasks/:projectId                   # Get all tasks
GET /api/tasks/:projectId/:taskId           # Get specific task
POST /api/tasks/:projectId                  # Create new task
```

### Content
```http
POST /api/content/extract                   # Extract translatable content
POST /api/content/extract-batch             # Batch extract content
```

## Authentication

**🚀 Production Flow**: The Builder.io plugin handles authentication automatically. Users enter their Lokalise API token and select projects in the plugin's configuration UI, and the plugin sends these values with each API request.

The API supports multiple authentication methods in order of priority:

### 1. Authorization Header (Production - Plugin Uses This)
```http
Authorization: Bearer YOUR_LOKALISE_API_TOKEN
```
**This is how the Builder.io plugin authenticates in production.**

### 2. Custom Headers (Alternative)
```http
X-Api-Token: YOUR_LOKALISE_API_TOKEN
Lokalise-Api-Token: YOUR_LOKALISE_API_TOKEN
```

### 3. Environment Variable (Development Fallback Only)
Set `LOKALISE_API_TOKEN` in your environment. This is only used when no token is provided in headers (useful for development and testing).

### Project Selection
- **Production**: Users select projects in the Builder.io plugin UI, and the project ID is included in the API URL path
- **Development**: Fallback to `LOKALISE_PROJECT_ID` environment variable if no project is specified in the request

## Example Usage

### Fetch All Projects
```javascript
const response = await fetch('http://localhost:3000/api/projects', {
  headers: {
    'Authorization': 'Bearer YOUR_LOKALISE_API_TOKEN'
  }
});
const data = await response.json();
```

### Create Translation Keys
```javascript
const response = await fetch('http://localhost:3000/api/keys/PROJECT_ID', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_LOKALISE_API_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    keys: [
      {
        key_name: 'homepage.welcome_message',
        description: 'Welcome message on homepage',
        platforms: ['web']
      }
    ]
  })
});
```

### Extract Content for Translation
```javascript
const response = await fetch('http://localhost:3000/api/content/extract', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_LOKALISE_API_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: builderContent,
    entryName: 'Homepage',
    projectId: 'PROJECT_ID'
  })
});
```

## Deployment Options

### Railway (Recommended)
- ✅ **Auto-scaling** - Handles traffic spikes automatically
- ✅ **Zero-config** - Works out of the box with `railway.toml`
- ✅ **Easy handover** - Simple account transfer to customers
- ✅ **Custom domains** - Professional URLs for enterprise

### Other Platforms
The API is containerized and can deploy to:
- **Vercel** - Add `vercel.json` configuration
- **Heroku** - Add `Procfile`
- **AWS/GCP/Azure** - Use container deployment
- **Docker** - Build and run container anywhere

## Security

### Rate Limiting
- **100 requests per 15 minutes** per IP address (configurable)
- **10MB payload limit** for file uploads
- **Timeout protection** prevents hanging requests

### CORS Security
- **Configured origins** - Only allows requests from Builder.io domains
- **Credentials support** - Handles authentication cookies if needed
- **Preflight handling** - Proper CORS preflight response

### Environment Security
- **Token encryption** - API tokens are never logged
- **Error sanitization** - Production errors don't leak sensitive data
- **Health checks** - Monitor server health and uptime

## Customer Handover

### For Enterprise Customers

1. **Fork Repository** - Customer forks the GitHub repo to their account
2. **Railway Account** - Customer creates Railway account
3. **Environment Transfer** - Copy environment variables to customer's Railway
4. **DNS Update** - Update Builder.io plugin configuration with new URL
5. **Support Handover** - 30-minute call to transfer knowledge

### Handover Checklist
- [ ] Repository forked to customer account
- [ ] Railway project created in customer account
- [ ] Environment variables configured
- [ ] Custom domain configured (if needed)
- [ ] Builder.io plugin updated with new backend URL
- [ ] Documentation provided to customer
- [ ] Support contact information shared

## Monitoring

### Health Monitoring
```http
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### Logging
- **Request logging** - All API requests logged with Morgan
- **Error logging** - Detailed error information in development
- **Performance monitoring** - Request timing and response sizes

## Troubleshooting

### Common Issues

#### 401 Unauthorized
- **Check API token** - Ensure valid Lokalise API token
- **Check headers** - Verify Authorization header format
- **Check permissions** - Ensure token has required project access

#### 429 Too Many Requests
- **Rate limiting** - Wait and retry after rate limit window
- **Increase limits** - Adjust `RATE_LIMIT_MAX_REQUESTS` environment variable
- **Implement backoff** - Add exponential backoff in client

#### CORS Errors
- **Check origins** - Verify domain is in `ALLOWED_ORIGINS`
- **Protocol mismatch** - Ensure HTTP/HTTPS consistency
- **Port issues** - Include port numbers if using non-standard ports

### Development Debugging

```bash
# Enable debug logging
NODE_ENV=development npm run dev

# Check logs
tail -f logs/server.log

# Test health endpoint
curl http://localhost:3000/health
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs on GitHub Issues
- **Enterprise Support**: Contact Builder.io team for enterprise support options

---

Built with ❤️ for the Builder.io community