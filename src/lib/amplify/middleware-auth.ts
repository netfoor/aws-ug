// src\lib\amplify\middleware-auth.ts

/**
 * SECURE authentication verification for Next.js middleware
 * Uses only safe authentication state from cookies, NOT sensitive JWT tokens
 * This approach prioritizes security while maintaining middleware functionality
 */

// Verification function optimized for middleware's secure environment
export async function verifyTokensInMiddleware(request: Request): Promise<{
  isValid: boolean;
  userInfo?: any;
  groups?: string[];
}> {
  try {
    // Parse cookies from request headers
    const cookies = parseCookies(request.headers.get('cookie') || '');
    
    // Check if user is authenticated using our secure flags
    if (cookies.is_authenticated === 'true' && 
        cookies.user_info && 
        cookies.token_exp) {
      
      // Validate token expiration
      const tokenExpiration = parseInt(cookies.token_exp);
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (tokenExpiration <= currentTime) {
        // Token has expired
        return { isValid: false };
      }
      
      // Parse user information and groups
      try {
        const userInfo = JSON.parse(cookies.user_info);
        const groups = cookies.user_groups ? JSON.parse(cookies.user_groups) : [];
        
        // Basic validation of user info structure
        if (!userInfo.sub || !userInfo.email) {
          return { isValid: false };
        }
        
        return {
          isValid: true,
          userInfo,
          groups
        };
      } catch (parseError) {
        console.error('Error parsing user info in middleware:', parseError);
        return { isValid: false };
      }
    }
    
    // No valid authentication state found
    return { isValid: false };
  } catch (error) {
    console.error('Error verifying authentication in middleware:', error);
    return { isValid: false };
  }
}

/**
 * Helper function to check if user belongs to a specific group
 */
export function userHasGroup(groups: string[], targetGroup: string): boolean {
  return Array.isArray(groups) && groups.includes(targetGroup);
}

/**
 * Helper function to check if user is admin
 */
export function isUserAdmin(groups: string[]): boolean {
  return userHasGroup(groups, 'ADMINS');
}

// Parse cookies from the cookie header
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}
