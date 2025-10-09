/**
 * Integration Tests for Authentication System
 * 
 * These tests validate that all authentication components work together:
 * - AuthProvider context management
 * - Token synchronization with cookies
 * - Middleware authentication verification
 * - Complete login/logout flows
 * - Role-based access control
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { syncTokensToMiddleware } from '@/lib/amplify/token-sync';
import { verifyTokensInMiddleware } from '@/lib/amplify/middleware-auth';
import { setupTestMocks } from '../utils/test-utils';
import { authScenarios } from '../mocks/auth-mocks';

// Mock js-cookie for token sync integration
jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn()
}));

// Mock auth functions for integration testing
jest.mock('@/lib/amplify/auth', () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn(),
  signInWithHostedUI: jest.fn(),
  createAuthListener: jest.fn(() => jest.fn()),
  checkIsUserAdmin: jest.fn(),
  getUserAttributes: jest.fn(),
}));

// Mock aws-amplify/auth for token sync
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(),
}));

// Test component that simulates a real application component
const AuthenticatedApp = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isAdmin, 
    error,
    login,
    logout 
  } = useAuth();

  if (isLoading) {
    return <div data-testid="app-loading">Loading app...</div>;
  }

  if (error) {
    return <div data-testid="app-error">App Error: {error.message}</div>;
  }

  if (!isAuthenticated) {
    return (
      <div data-testid="app-unauthenticated">
        <h1>Please log in</h1>
        <button onClick={() => login()} data-testid="app-login-btn">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div data-testid="app-authenticated">
      <h1>Welcome, {user?.username || 'User'}!</h1>
      <div data-testid="app-user-info">
        <p>Email: {user?.username}</p>
        <p>Role: {isAdmin ? 'Admin' : 'Member'}</p>
      </div>
      {isAdmin && (
        <div data-testid="app-admin-panel">
          <h2>Admin Panel</h2>
          <p>Admin-only content</p>
        </div>
      )}
      <button onClick={() => logout()} data-testid="app-logout-btn">
        Sign Out
      </button>
    </div>
  );
};

describe('Authentication Integration Tests', () => {
  const mockAuthFunctions = require('@/lib/amplify/auth');
  const mockCookies = require('js-cookie');
  const { fetchAuthSession } = require('aws-amplify/auth');

  beforeEach(() => {
    setupTestMocks();
    
    // Clear all mocks
    Object.values(mockAuthFunctions).forEach((mockFn: any) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });
    Object.values(mockCookies).forEach((mockFn: any) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });
    
    // Setup default fetchAuthSession mock
    fetchAuthSession.mockClear();
    fetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: {
          payload: {
            'cognito:groups': ['MEMBERS']
          }
        },
        idToken: {
          payload: {
            sub: 'test-user-id',
            email: 'test@example.com',
            given_name: 'Test',
            family_name: 'User',
            exp: 9999999999
          }
        }
      }
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete login flow: unauthenticated → login → token sync → middleware verification', async () => {
      const memberScenario = authScenarios.memberUser;
      
      // Step 1: Start unauthenticated
      mockAuthFunctions.getCurrentUser.mockRejectedValue(new Error('User not authenticated'));
      
      render(
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      );

      // Verify initial unauthenticated state
      await waitFor(() => {
        expect(screen.getByTestId('app-unauthenticated')).toBeInTheDocument();
      });

      // Step 2: Simulate successful login
      mockAuthFunctions.getCurrentUser.mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue(memberScenario.user.attributes);
      mockAuthFunctions.signInWithHostedUI.mockResolvedValue(undefined);

      // Trigger login
      const loginBtn = screen.getByTestId('app-login-btn');
      await act(async () => {
        fireEvent.click(loginBtn);
      });

      // Step 3: Verify token synchronization was called
      await waitFor(() => {
        expect(mockCookies.set).toHaveBeenCalledWith(
          'is_authenticated', 
          'true',
          expect.any(Object)
        );
      });

      // Step 4: Simulate app refresh/navigation and verify middleware verification
      // Reset getCurrentUser to simulate persistent state
      mockAuthFunctions.getCurrentUser.mockResolvedValue(memberScenario.user);
      
      // Simulate token sync for middleware
      await act(async () => {
        await syncTokensToMiddleware();
      });

      // Step 5: Verify authenticated app state
      await waitFor(() => {
        expect(screen.getByTestId('app-authenticated')).toBeInTheDocument();
        expect(screen.getByText(`Welcome, ${memberScenario.user.username}!`)).toBeInTheDocument();
        expect(screen.getByText('Role: Member')).toBeInTheDocument();
      });

      // Step 6: Verify no admin panel for regular user
      expect(screen.queryByTestId('app-admin-panel')).not.toBeInTheDocument();
    });

    it('should handle admin login flow with role-based access', async () => {
      const adminScenario = authScenarios.adminUser;
      
      // Start unauthenticated
      mockAuthFunctions.getCurrentUser.mockRejectedValue(new Error('User not authenticated'));
      
      render(
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('app-unauthenticated')).toBeInTheDocument();
      });

      // Simulate admin login
      mockAuthFunctions.getCurrentUser.mockResolvedValue(adminScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(true);
      mockAuthFunctions.getUserAttributes.mockResolvedValue(adminScenario.user.attributes);
      mockAuthFunctions.signInWithHostedUI.mockResolvedValue(undefined);

      const loginBtn = screen.getByTestId('app-login-btn');
      await act(async () => {
        fireEvent.click(loginBtn);
      });

      // Verify admin authentication and privileges
      await waitFor(() => {
        expect(screen.getByTestId('app-authenticated')).toBeInTheDocument();
        expect(screen.getByText('Role: Admin')).toBeInTheDocument();
        expect(screen.getByTestId('app-admin-panel')).toBeInTheDocument();
      });

      // Verify token sync includes admin groups
      expect(mockCookies.set).toHaveBeenCalledWith(
        'user_groups',
        expect.stringContaining('ADMINS'),
        expect.any(Object)
      );
    });

    it('should handle complete logout flow: authenticated → logout → token cleanup → unauthenticated', async () => {
      const memberScenario = authScenarios.memberUser;
      
      // Start authenticated
      mockAuthFunctions.getCurrentUser.mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue(memberScenario.user.attributes);
      
      render(
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      );

      // Verify authenticated state
      await waitFor(() => {
        expect(screen.getByTestId('app-authenticated')).toBeInTheDocument();
      });

      // Step 1: Trigger logout
      mockAuthFunctions.signOut.mockResolvedValue(undefined);
      mockAuthFunctions.getCurrentUser.mockRejectedValue(new Error('User not authenticated'));

      const logoutBtn = screen.getByTestId('app-logout-btn');
      await act(async () => {
        fireEvent.click(logoutBtn);
      });

      // Step 2: Verify logout was called
      expect(mockAuthFunctions.signOut).toHaveBeenCalled();

      // Step 3: Verify token cleanup
      await waitFor(() => {
        expect(mockCookies.remove).toHaveBeenCalledWith('is_authenticated');
        expect(mockCookies.remove).toHaveBeenCalledWith('user_info');
        expect(mockCookies.remove).toHaveBeenCalledWith('user_groups');
        expect(mockCookies.remove).toHaveBeenCalledWith('token_exp');
      });

      // Step 4: Verify return to unauthenticated state
      await waitFor(() => {
        expect(screen.getByTestId('app-unauthenticated')).toBeInTheDocument();
      });
    });
  });

  describe('Middleware Integration', () => {
    it('should integrate context authentication with middleware verification', async () => {
      const memberScenario = authScenarios.memberUser;
      
      // Setup authenticated context
      mockAuthFunctions.getCurrentUser.mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue(memberScenario.user.attributes);
      
      render(
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('app-authenticated')).toBeInTheDocument();
      });

      // Simulate token sync to middleware
      await act(async () => {
        await syncTokensToMiddleware();
      });

      // Create mock request with synced cookies
      const userInfo = {
        sub: memberScenario.user.userId,
        email: memberScenario.user.username,
        given_name: 'Test',
        family_name: 'User',
        exp: 9999999999
      };
      
      const mockCookieString = [
        'is_authenticated=true',
        `user_info=${encodeURIComponent(JSON.stringify(userInfo))}`,
        'user_groups=%5B%22MEMBERS%22%5D',
        'token_exp=9999999999'
      ].join('; ');

      const mockRequest = {
        headers: {
          get: (key: string) => key === 'cookie' ? mockCookieString : null
        }
      };

      // Verify middleware can verify the tokens
      const middlewareResult = await verifyTokensInMiddleware(mockRequest as any);
      
      expect(middlewareResult.isValid).toBe(true);
      expect(middlewareResult.userInfo).toEqual(expect.objectContaining({
        sub: memberScenario.user.userId,
        email: memberScenario.user.username
      }));
      expect(middlewareResult.groups).toContain('MEMBERS');
    });

    it('should handle middleware verification for admin users', async () => {
      const adminScenario = authScenarios.adminUser;
      
      // Setup admin context
      mockAuthFunctions.getCurrentUser.mockResolvedValue(adminScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(true);
      mockAuthFunctions.getUserAttributes.mockResolvedValue(adminScenario.user.attributes);
      
      render(
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('app-authenticated')).toBeInTheDocument();
        expect(screen.getByTestId('app-admin-panel')).toBeInTheDocument();
      });

      // Simulate token sync to middleware
      await act(async () => {
        await syncTokensToMiddleware();
      });

      // Create mock request with admin cookies
      const adminUserInfo = {
        sub: adminScenario.user.userId,
        email: adminScenario.user.username,
        given_name: 'Admin',
        family_name: 'User',
        exp: 9999999999
      };
      
      const mockCookieString = [
        'is_authenticated=true',
        `user_info=${encodeURIComponent(JSON.stringify(adminUserInfo))}`,
        'user_groups=%5B%22ADMINS%22%2C%22MEMBERS%22%5D',
        'token_exp=9999999999'
      ].join('; ');

      const mockRequest = {
        headers: {
          get: (key: string) => key === 'cookie' ? mockCookieString : null
        }
      };

      // Verify middleware recognizes admin privileges
      const middlewareResult = await verifyTokensInMiddleware(mockRequest as any);
      
      expect(middlewareResult.isValid).toBe(true);
      expect(middlewareResult.groups).toContain('ADMINS');
      expect(middlewareResult.groups).toContain('MEMBERS');
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle authentication errors gracefully across all components', async () => {
      // Start with authentication error
      mockAuthFunctions.getCurrentUser.mockRejectedValue(new Error('Network error'));
      
      render(
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      );

      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('app-error')).toBeInTheDocument();
        expect(screen.getByText('App Error: Network error')).toBeInTheDocument();
      });

      // Verify no tokens were synced during error
      expect(mockCookies.set).not.toHaveBeenCalled();
    });

    it('should handle token sync failures during login', async () => {
      const memberScenario = authScenarios.memberUser;
      
      // Start unauthenticated
      mockAuthFunctions.getCurrentUser.mockRejectedValue(new Error('User not authenticated'));
      
      render(
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('app-unauthenticated')).toBeInTheDocument();
      });

      // Setup successful auth but token sync failure
      mockAuthFunctions.getCurrentUser.mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue(memberScenario.user.attributes);
      mockAuthFunctions.signInWithHostedUI.mockResolvedValue(undefined);
      
      // Mock cookie failure
      mockCookies.set.mockImplementation(() => {
        throw new Error('Cookie storage failed');
      });

      // Login should still work even if token sync fails
      const loginBtn = screen.getByTestId('app-login-btn');
      await act(async () => {
        fireEvent.click(loginBtn);
      });

      // App should still show authenticated state
      await waitFor(() => {
        expect(screen.getByTestId('app-authenticated')).toBeInTheDocument();
      });
    });
  });

  describe('Session Persistence Integration', () => {
    it('should maintain authentication state across app refreshes', async () => {
      const memberScenario = authScenarios.memberUser;
      
      // Simulate returning user with existing session
      mockAuthFunctions.getCurrentUser.mockResolvedValue(memberScenario.user);
      mockAuthFunctions.checkIsUserAdmin.mockResolvedValue(false);
      mockAuthFunctions.getUserAttributes.mockResolvedValue(memberScenario.user.attributes);
      
      // Mock existing cookies
      mockCookies.get.mockImplementation((key: string) => {
        const cookies: Record<string, string> = {
          'is_authenticated': 'true',
          'user_info': JSON.stringify(memberScenario.user),
          'user_groups': JSON.stringify(['MEMBERS']),
          'token_exp': '9999999999'
        };
        return cookies[key];
      });

      render(
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      );

      // Should immediately show authenticated state
      await waitFor(() => {
        expect(screen.getByTestId('app-authenticated')).toBeInTheDocument();
        expect(screen.getByText(`Welcome, ${memberScenario.user.username}!`)).toBeInTheDocument();
      });

      // Should not need to call login again
      expect(mockAuthFunctions.signInWithHostedUI).not.toHaveBeenCalled();
    });
  });
});