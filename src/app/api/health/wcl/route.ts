/**
 * GET /api/health/wcl
 * 
 * Health check for Warcraft Logs API connectivity
 * Tests OAuth token acquisition
 */

import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

export async function GET(request: NextRequest) {
  try {
    console.log('[health/wcl] Testing WCL API connectivity')

    const clientId = process.env.WCL_CLIENT_ID
    const clientSecret = process.env.WCL_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return successResponse({
        ok: false,
        code: 'WCL_CONFIG_MISSING',
        message: 'Warcraft Logs credentials not configured'
      })
    }

    // Try to get an OAuth token
    const tokenUrl = 'https://www.warcraftlogs.com/oauth/token'
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      console.error('[health/wcl] OAuth failed:', {
        status: response.status,
        body: responseText.substring(0, 500)
      })
      
      return successResponse({
        ok: false,
        code: 'WCL_OAUTH_FAILED',
        message: `WCL OAuth failed with status ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText
        }
      })
    }

    const data = await response.json()
    
    if (!data.access_token) {
      return successResponse({
        ok: false,
        code: 'WCL_OAUTH_INVALID_RESPONSE',
        message: 'WCL OAuth response missing access token'
      })
    }

    console.log('[health/wcl] ✅ WCL API connectivity OK')
    
    return successResponse({
      ok: true,
      message: 'Warcraft Logs API is accessible',
      details: {
        hasToken: true,
        tokenLength: data.access_token.length,
        expiresIn: data.expires_in
      }
    })

  } catch (error) {
    console.error('[health/wcl] Unexpected error:', error)
    
    return successResponse({
      ok: false,
      code: 'WCL_HEALTH_CHECK_FAILED',
      message: error instanceof Error ? error.message : 'Health check failed',
    })
  }
}
