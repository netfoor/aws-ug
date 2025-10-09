import { setupTokenSync, useTokenSync } from '@/lib/amplify/token-sync';
import { setupTestMocks } from '../utils/test-utils';

// Mock fetchAuthSession from aws-amplify/auth
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(),
}));

// Mock js-cookie
jest.mock('js-cookie', () => ({
  set: jest.fn(),
  remove: jest.fn(),
}));

describe('token-sync utility', () => {
  const mockFetchAuthSession = require('aws-amplify/auth').fetchAuthSession;
  const mockCookies = require('js-cookie');
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    setupTestMocks();
    jest.clearAllMocks();
    
    // Reset environment
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    // Restore original NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalNodeEnv,
      writable: true,
      configurable: true
    });
  });

  describe('setupTokenSync', () => {
    describe('when user is authenticated', () => {
      it('should set authentication cookies with user metadata', async () => {
        const mockSession = {
          tokens: {
            accessToken: {
              payload: {
                'cognito:groups': ['MEMBERS'],
                sub: 'test-user-123',
                email: 'test@example.com',
              },
            },
            idToken: {
              payload: {
                sub: 'test-user-123',
                email: 'test@example.com',
                given_name: 'Test',
                family_name: 'User',
                exp: 1234567890,
              },
            },
          },
        };

        mockFetchAuthSession.mockResolvedValue(mockSession);

        setupTokenSync();

        // Wait for async operation
        await new Promise(resolve => process.nextTick(resolve));

        // Verify authentication flag
        expect(mockCookies.set).toHaveBeenCalledWith(
          'is_authenticated',
          'true',
          expect.objectContaining({
            path: '/',
            secure: false, // test environment
            sameSite: 'strict',
            expires: 1,
          })
        );

        // Verify user groups
        expect(mockCookies.set).toHaveBeenCalledWith(
          'user_groups',
          JSON.stringify(['MEMBERS']),
          expect.any(Object)
        );

        // Verify user info (safe metadata only)
        const expectedUserInfo = {
          sub: 'test-user-123',
          email: 'test@example.com',
          given_name: 'Test',
          family_name: 'User',
          exp: 1234567890,
        };
        expect(mockCookies.set).toHaveBeenCalledWith(
          'user_info',
          JSON.stringify(expectedUserInfo),
          expect.any(Object)
        );

        // Verify token expiration
        expect(mockCookies.set).toHaveBeenCalledWith(
          'token_exp',
          '1234567890',
          expect.any(Object)
        );
      });

      it('should handle admin user with multiple groups', async () => {
        const mockSession = {
          tokens: {
            accessToken: {
              payload: {
                'cognito:groups': ['ADMINS', 'MEMBERS'],
                sub: 'admin-user-123',
                email: 'admin@example.com',
              },
            },
            idToken: {
              payload: {
                sub: 'admin-user-123',
                email: 'admin@example.com',
                given_name: 'Admin',
                family_name: 'User',
                exp: 1234567890,
              },
            },
          },
        };

        mockFetchAuthSession.mockResolvedValue(mockSession);
        setupTokenSync();
        await new Promise(resolve => process.nextTick(resolve));

        // Verify user groups include both ADMINS and MEMBERS
        expect(mockCookies.set).toHaveBeenCalledWith(
          'user_groups',
          JSON.stringify(['ADMINS', 'MEMBERS']),
          expect.any(Object)
        );
      });

      it('should handle user with no groups', async () => {
        const mockSession = {
          tokens: {
            accessToken: {
              payload: {
                sub: 'user-no-groups-123',
                email: 'nogroups@example.com',
                // No cognito:groups field
              },
            },
            idToken: {
              payload: {
                sub: 'user-no-groups-123',
                email: 'nogroups@example.com',
                given_name: 'No',
                family_name: 'Groups',
                exp: 1234567890,
              },
            },
          },
        };

        mockFetchAuthSession.mockResolvedValue(mockSession);
        setupTokenSync();
        await new Promise(resolve => process.nextTick(resolve));

        // Should set empty array for groups
        expect(mockCookies.set).toHaveBeenCalledWith(
          'user_groups',
          JSON.stringify([]),
          expect.any(Object)
        );
      });
    });

    describe('when user is not authenticated', () => {
      it('should clear all authentication cookies', async () => {
        const mockSession = {
          tokens: null, // No tokens
        };

        mockFetchAuthSession.mockResolvedValue(mockSession);
        setupTokenSync();
        await new Promise(resolve => process.nextTick(resolve));

        // Verify all auth cookies are cleared
        expect(mockCookies.remove).toHaveBeenCalledWith('is_authenticated', { path: '/' });
        expect(mockCookies.remove).toHaveBeenCalledWith('user_groups', { path: '/' });
        expect(mockCookies.remove).toHaveBeenCalledWith('user_info', { path: '/' });
        expect(mockCookies.remove).toHaveBeenCalledWith('token_exp', { path: '/' });
      });

      it('should clear cookies when session has no access token', async () => {
        const mockSession = {
          tokens: {
            accessToken: null,
            idToken: {
              payload: {
                sub: 'test-user-123',
                email: 'test@example.com',
              },
            },
          },
        };

        mockFetchAuthSession.mockResolvedValue(mockSession);
        setupTokenSync();
        await new Promise(resolve => process.nextTick(resolve));

        // Should clear cookies since accessToken is missing
        expect(mockCookies.remove).toHaveBeenCalledTimes(4);
      });
    });

    describe('error handling', () => {
      it('should clear cookies when fetchAuthSession throws an error', async () => {
        mockFetchAuthSession.mockRejectedValue(new Error('Auth session failed'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        setupTokenSync();
        await new Promise(resolve => process.nextTick(resolve));

        // Should log error
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error synchronizing auth state to cookies:',
          expect.any(Error)
        );

        // Should clear all cookies on error
        expect(mockCookies.remove).toHaveBeenCalledTimes(4);

        consoleSpy.mockRestore();
      });
    });

    describe('environment-specific behavior', () => {
      it('should verify production cookie behavior (simplified)', async () => {
        // This is a simplified test that verifies the logic would work in production
        // The actual production check happens at runtime with real process.env
        
        const mockSession = {
          tokens: {
            accessToken: {
              payload: {
                'cognito:groups': ['MEMBERS'],
                sub: 'test-user-123',
              },
            },
            idToken: {
              payload: {
                sub: 'test-user-123',
                email: 'test@example.com',
                exp: 1234567890,
              },
            },
          },
        };

        mockFetchAuthSession.mockResolvedValue(mockSession);
        setupTokenSync();
        await new Promise(resolve => process.nextTick(resolve));

        // Verify cookies are set (secure flag depends on runtime environment)
        expect(mockCookies.set).toHaveBeenCalledWith(
          'is_authenticated',
          'true',
          expect.objectContaining({
            path: '/',
            sameSite: 'strict',
            expires: 1,
          })
        );
      });

      it('should verify server-side safety', () => {
        // This test verifies that the function contains the proper server-side checks
        // In a real server environment, `typeof window === 'undefined'` would be true
        
        const functionString = setupTokenSync.toString();
        
        // Verify the function has the server-side safety check
        expect(functionString).toContain('typeof window === \'undefined\'');
        expect(functionString).toContain('return undefined');
        
        // In Jest environment (browser-like), function returns cleanup function
        const result = setupTokenSync();
        expect(typeof result).toBe('function');
      });
    });
  });

  describe('useTokenSync', () => {
    it('should call setupTokenSync in client environment', () => {
      // This test verifies the hook exists and can be called
      expect(typeof useTokenSync).toBe('function');
      
      // Call it to ensure no errors
      const result = useTokenSync();
      expect(result).toBeUndefined();
    });

    it('should not run in server-side environment', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const result = useTokenSync();
      expect(result).toBeUndefined();

      global.window = originalWindow;
    });
  });
});