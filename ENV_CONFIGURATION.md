# Environment Variables Configuration

## Warcraft Logs API

To enable player card enrichment with Warcraft Logs data, you need to configure API credentials.

### Getting API Credentials

1. Go to https://www.warcraftlogs.com/api/clients/
2. Create a new client application
3. Copy your Client ID and Client Secret

### Configuration

Add these environment variables to your `.env.local` file:

```env
WCL_CLIENT_ID=your_client_id_here
WCL_CLIENT_SECRET=your_client_secret_here
```

### Optional Configuration

```env
# Override default API URL (not typically needed)
WCL_API_URL=https://www.warcraftlogs.com/api/v2/client
```

### Without API Credentials

If WCL API credentials are not configured:
- The enrichment endpoint will return cached data if available
- New enrichment requests will fail with a 503 error
- The system will gracefully handle missing configuration

### Verifying Configuration

Check if WCL API is configured:

```typescript
import { isWarcraftLogsConfigured } from '@/lib/warcraft-logs-client'

if (isWarcraftLogsConfigured()) {
  console.log('✅ Warcraft Logs API is configured')
} else {
  console.log('⚠️  Warcraft Logs API is NOT configured')
}
```

### Security Notes

- Never commit `.env.local` to version control
- Keep your Client Secret secure
- Rotate credentials periodically
- Use different credentials for development and production
