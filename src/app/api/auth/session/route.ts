// src/app/api/auth/session/route.ts

/**
 * API Route for server-side authentication verification
 * This provides a secure way for middleware to check authentication status
 * without exposing JWT tokens to the client
 * 
 * Security features:
 * - Rate limiting: 100 requests/minute per IP
 * - Server-side only token verification
 * - Detailed error logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { runWithAmplifyServerContext } from '@/lib/amplify/server-utils';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { authRateLimiter } from '@/lib/rate-limiter';

/**
 * Obtiene la IP del cliente desde los headers
 */
function getClientIP(request: NextRequest): string {
  // Vercel/Cloudflare/nginx headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback a IP genérica (no ideal para producción)
  return 'unknown';
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting por IP
    const clientIP = getClientIP(request);
    const rateLimitResult = authRateLimiter.check(clientIP);
    
    // Si excede el límite, retornar 429 Too Many Requests
    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime);
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetDate.toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }
    
    // Para Next.js App Router, necesitamos usar cookies directamente
    const { cookies } = await import('next/headers');
    
    const authenticated = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        try {
          const session = await fetchAuthSession(contextSpec);
          
          // Check if we have valid tokens
          if (!session.tokens?.accessToken) {
            return {
              isAuthenticated: false,
              groups: [],
              expiresAt: 0
            };
          }
          
          // Extract user groups from access token
          const groups = (session.tokens.accessToken.payload['cognito:groups'] as string[]) || [];
          
          // Get token expiration
          const exp = session.tokens.accessToken.payload.exp || 0;
          
          return {
            isAuthenticated: true,
            groups,
            expiresAt: exp
          };
        } catch (error) {
          // Log completo del error para debugging
          console.error('Error in fetchAuthSession:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            error,
          });
          return {
            isAuthenticated: false,
            groups: [],
            expiresAt: 0
          };
        }
      }
    });

    // Agregar headers de rate limit a la respuesta exitosa
    const response = NextResponse.json(authenticated);
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
    
    return response;
  } catch (error) {
    // Log completo del error
    console.error('Error in session API route:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    return NextResponse.json({
      isAuthenticated: false,
      groups: [],
      expiresAt: 0
    }, { status: 500 });
  }
}
