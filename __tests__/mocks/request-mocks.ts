import { NextRequest } from 'next/server'

// Mock NextRequest helper
export function createMockRequest(
  url: string = 'http://localhost:3000',
  options: {
    method?: string
    headers?: Record<string, string>
    cookies?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, cookies = {} } = options

  // Create cookie string from cookies object
  const cookieString = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')

  const mockHeaders = new Headers({
    ...headers,
    ...(cookieString && { cookie: cookieString }),
  })

  const mockRequest = new NextRequest(url, {
    method,
    headers: mockHeaders,
  })

  return mockRequest
}

// Mock Response helpers
export function createMockResponse(
  status: number = 200,
  headers: Record<string, string> = {}
) {
  return new Response(null, { status, headers })
}

// Cookie test utilities
export const cookieScenarios = {
  authenticated: {
    'auth-user-id': 'test-user-123',
    'auth-user-groups': 'MEMBERS',
    'auth-user-email': 'testuser@example.com',
  },
  admin: {
    'auth-user-id': 'admin-user-123',
    'auth-user-groups': 'ADMINS',
    'auth-user-email': 'admin@example.com',
  },
  speaker: {
    'auth-user-id': 'speaker-user-123',
    'auth-user-groups': 'SPEAKERS',
    'auth-user-email': 'speaker@example.com',
  },
  unauthenticated: {},
}

// Route test scenarios
export const routeScenarios = {
  publicRoutes: ['/', '/login', '/about'],
  protectedRoutes: ['/profile', '/settings', '/members'],
  adminRoutes: ['/admin', '/admin/users', '/admin/settings'],
  speakerRoutes: ['/speakers', '/speakers/dashboard'],
}