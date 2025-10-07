//src\lib\amplify\token-sync.ts

'use client';

import { fetchAuthSession } from 'aws-amplify/auth';
import Cookies from 'js-cookie';

/**
 * Handles synchronizing authentication state to HTTP cookies for middleware access
 * SECURITY: Only stores authentication state and user metadata, NOT sensitive tokens
 * This is necessary because Next.js middleware can only access cookies, not localStorage
 */
export function setupTokenSync() {
  if (typeof window === 'undefined') return;
  
  // Define secure cookie options for middleware access
  const cookieOptions = {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as 'strict',
    expires: 1 // Reduce to 1 day for better security
  };

  // Function to synchronize authentication state to cookies (NOT tokens)
  const syncAuthStateToCookies = async () => {
    try {
      const session = await fetchAuthSession();
      
      if (session.tokens?.accessToken && session.tokens?.idToken) {
        // Extract safe user information from tokens without exposing the tokens themselves
        const accessTokenPayload = session.tokens.accessToken.payload;
        const idTokenPayload = session.tokens.idToken.payload;
        
        // Set authentication state flag
        Cookies.set('is_authenticated', 'true', cookieOptions);
        
        // Store user groups for authorization (safe to expose)
        const userGroups = accessTokenPayload['cognito:groups'] || [];
        Cookies.set('user_groups', JSON.stringify(userGroups), cookieOptions);
        
        // Store basic user info (safe metadata only)
        const userInfo = {
          sub: idTokenPayload.sub,
          email: idTokenPayload.email,
          given_name: idTokenPayload.given_name,
          family_name: idTokenPayload.family_name,
          exp: idTokenPayload.exp // For expiration checking
        };
        Cookies.set('user_info', JSON.stringify(userInfo), cookieOptions);
        
        // Store token expiration for middleware validation (with safety check)
        if (idTokenPayload.exp) {
          Cookies.set('token_exp', idTokenPayload.exp.toString(), cookieOptions);
        }
        
      } else {
        // Clear all authentication cookies if no valid tokens
        clearAuthCookies();
      }
    } catch (error) {
      console.error('Error synchronizing auth state to cookies:', error);
      // Clear cookies on error to prevent stale state
      clearAuthCookies();
    }
  };

  // Helper function to clear all authentication cookies
  const clearAuthCookies = () => {
    const cookiesToClear = ['is_authenticated', 'user_groups', 'user_info', 'token_exp'];
    cookiesToClear.forEach(cookieName => {
      Cookies.remove(cookieName, { path: '/' });
    });
  };

  // Run once on initialization
  syncAuthStateToCookies();

  // Set up event listeners to keep auth state in sync
  window.addEventListener('focus', syncAuthStateToCookies);
  
  // Set up interval to periodically sync auth state (every 2 minutes)
  const interval = setInterval(syncAuthStateToCookies, 2 * 60 * 1000);
  
  // Clean up on unmount
  return () => {
    window.removeEventListener('focus', syncAuthStateToCookies);
    clearInterval(interval);
  };
}

/**
 * Hook to use in the main layout or app component to enable token synchronization
 */
export function useTokenSync() {
  if (typeof window === 'undefined') return;
  
  // Set up the token sync on first render
  setupTokenSync();
}
