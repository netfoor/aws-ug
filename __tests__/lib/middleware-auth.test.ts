import { 
  verifyTokensInMiddleware, 
  userHasGroup, 
  isUserAdmin 
} from '@/lib/amplify/middleware-auth';
import { setupTestMocks } from '../utils/test-utils';
import { cookieScenarios } from '../mocks/request-mocks';

// Polyfill Request for Node.js environment
class MockRequest {
  constructor(public url: string, public init: { headers: any } = { headers: {} }) {}
  
  get headers() {
    const headers = new Map();
    const cookie = this.init.headers?.cookie;
    if (cookie) {
      headers.set('cookie', cookie);
    }
    return {
      get: (key: string) => headers.get(key.toLowerCase())
    };
  }
}

global.Request = MockRequest as any;

describe('middleware-auth functions', () => {
  beforeEach(() => {
    setupTestMocks();
  });

  describe('verifyTokensInMiddleware', () => {
    describe('with valid authentication', () => {
      it('should verify authenticated member user', async () => {
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: 'is_authenticated=true; user_info=%7B%22sub%22%3A%22test-user-123%22%2C%22email%22%3A%22test%40example.com%22%2C%22given_name%22%3A%22Test%22%2C%22family_name%22%3A%22User%22%2C%22exp%22%3A9999999999%7D; user_groups=%5B%22MEMBERS%22%5D; token_exp=9999999999'
          }
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(true);
        expect(result.userInfo).toEqual({
          sub: 'test-user-123',
          email: 'test@example.com',
          given_name: 'Test',
          family_name: 'User',
          exp: 9999999999
        });
        expect(result.groups).toEqual(['MEMBERS']);
      });

      it('should verify authenticated admin user', async () => {
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: 'is_authenticated=true; user_info=%7B%22sub%22%3A%22admin-123%22%2C%22email%22%3A%22admin%40example.com%22%2C%22exp%22%3A9999999999%7D; user_groups=%5B%22ADMINS%22%2C%22MEMBERS%22%5D; token_exp=9999999999'
          }
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(true);
        expect(result.userInfo?.sub).toBe('admin-123');
        expect(result.userInfo?.email).toBe('admin@example.com');
        expect(result.groups).toEqual(['ADMINS', 'MEMBERS']);
      });

      it('should handle user with no groups', async () => {
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: 'is_authenticated=true; user_info=%7B%22sub%22%3A%22user-123%22%2C%22email%22%3A%22user%40example.com%22%2C%22exp%22%3A9999999999%7D; token_exp=9999999999'
            // Note: no user_groups cookie
          }
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(true);
        expect(result.userInfo?.sub).toBe('user-123');
        expect(result.groups).toEqual([]); // Should default to empty array
      });
    });

    describe('with invalid authentication', () => {
      it('should reject unauthenticated requests', async () => {
        const mockRequest = new Request('http://localhost:3000', {
          headers: {} // No cookies
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(false);
        expect(result.userInfo).toBeUndefined();
        expect(result.groups).toBeUndefined();
      });

      it('should reject requests with missing authentication flag', async () => {
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: 'user_info=%7B%22sub%22%3A%22test%22%2C%22email%22%3A%22test%40example.com%22%7D; token_exp=9999999999'
            // Missing is_authenticated=true
          }
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(false);
      });

      it('should reject requests with missing user_info', async () => {
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: 'is_authenticated=true; token_exp=9999999999'
            // Missing user_info
          }
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(false);
      });

      it('should reject requests with missing token_exp', async () => {
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: 'is_authenticated=true; user_info=%7B%22sub%22%3A%22test%22%2C%22email%22%3A%22test%40example.com%22%7D'
            // Missing token_exp
          }
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(false);
      });
    });

    describe('token expiration handling', () => {
      it('should reject expired tokens', async () => {
        const expiredTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
        
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: `is_authenticated=true; user_info=%7B%22sub%22%3A%22test%22%2C%22email%22%3A%22test%40example.com%22%2C%22exp%22%3A${expiredTimestamp}%7D; user_groups=%5B%22MEMBERS%22%5D; token_exp=${expiredTimestamp}`
          }
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(false);
      });

      it('should accept valid (non-expired) tokens', async () => {
        const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: `is_authenticated=true; user_info=%7B%22sub%22%3A%22test%22%2C%22email%22%3A%22test%40example.com%22%2C%22exp%22%3A${futureTimestamp}%7D; user_groups=%5B%22MEMBERS%22%5D; token_exp=${futureTimestamp}`
          }
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(true);
      });

      it('should handle invalid token_exp format gracefully', async () => {
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: 'is_authenticated=true; user_info=%7B%22sub%22%3A%22test%22%2C%22email%22%3A%22test%40example.com%22%7D; token_exp=invalid-timestamp'
          }
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        // Should fail gracefully when timestamp is invalid
        expect(result.isValid).toBe(false);
      });
    });

    describe('malformed data handling', () => {
      it('should handle malformed user_info JSON gracefully', async () => {
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: 'is_authenticated=true; user_info=invalid-json; token_exp=9999999999'
          }
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error parsing user info in middleware:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it('should handle malformed user_groups JSON gracefully', async () => {
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: 'is_authenticated=true; user_info=%7B%22sub%22%3A%22test%22%2C%22email%22%3A%22test%40example.com%22%7D; user_groups=invalid-json; token_exp=9999999999'
          }
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error parsing user info in middleware:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it('should validate user_info structure', async () => {
        // Missing required fields (sub, email)
        const mockRequest = new Request('http://localhost:3000', {
          headers: {
            cookie: 'is_authenticated=true; user_info=%7B%22name%22%3A%22Test%22%7D; token_exp=9999999999'
            // user_info missing sub and email
          }
        });

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should handle general errors gracefully', async () => {
        // Create a request that will cause an error
        const mockRequest = {
          headers: {
            get: jest.fn(() => {
              throw new Error('Headers error');
            })
          }
        } as unknown as Request;

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await verifyTokensInMiddleware(mockRequest);

        expect(result.isValid).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error verifying authentication in middleware:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('userHasGroup', () => {
    it('should return true when user has the specified group', () => {
      const groups = ['MEMBERS', 'SPEAKERS'];
      
      expect(userHasGroup(groups, 'MEMBERS')).toBe(true);
      expect(userHasGroup(groups, 'SPEAKERS')).toBe(true);
    });

    it('should return false when user does not have the specified group', () => {
      const groups = ['MEMBERS'];
      
      expect(userHasGroup(groups, 'ADMINS')).toBe(false);
      expect(userHasGroup(groups, 'SPEAKERS')).toBe(false);
    });

    it('should return false for empty groups array', () => {
      const groups: string[] = [];
      
      expect(userHasGroup(groups, 'MEMBERS')).toBe(false);
    });

    it('should handle non-array groups gracefully', () => {
      // This tests the safety check for Array.isArray
      expect(userHasGroup(null as any, 'MEMBERS')).toBe(false);
      expect(userHasGroup(undefined as any, 'MEMBERS')).toBe(false);
      expect(userHasGroup('not-array' as any, 'MEMBERS')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const groups = ['MEMBERS'];
      
      expect(userHasGroup(groups, 'members')).toBe(false);
      expect(userHasGroup(groups, 'Members')).toBe(false);
    });
  });

  describe('isUserAdmin', () => {
    it('should return true for admin users', () => {
      const adminGroups = ['ADMINS', 'MEMBERS'];
      
      expect(isUserAdmin(adminGroups)).toBe(true);
    });

    it('should return true for admin-only users', () => {
      const adminOnlyGroups = ['ADMINS'];
      
      expect(isUserAdmin(adminOnlyGroups)).toBe(true);
    });

    it('should return false for non-admin users', () => {
      const memberGroups = ['MEMBERS'];
      const speakerGroups = ['SPEAKERS', 'MEMBERS'];
      
      expect(isUserAdmin(memberGroups)).toBe(false);
      expect(isUserAdmin(speakerGroups)).toBe(false);
    });

    it('should return false for empty groups', () => {
      expect(isUserAdmin([])).toBe(false);
    });

    it('should handle invalid input gracefully', () => {
      expect(isUserAdmin(null as any)).toBe(false);
      expect(isUserAdmin(undefined as any)).toBe(false);
    });
  });
});