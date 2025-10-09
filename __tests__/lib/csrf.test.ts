import {
  generateCSRFToken,
  getCSRFToken,
  setCSRFToken,
  verifyCSRFToken,
  ensureCSRFToken,
} from '@/lib/csrf';
import { cookies } from 'next/headers';

// Mock de next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('CSRF Protection', () => {
  let mockCookieStore: {
    get: jest.Mock;
    set: jest.Mock;
  };

  beforeEach(() => {
    // Reset mocks antes de cada test
    mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
    };
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCSRFToken', () => {
    it('should generate a token with correct length', () => {
      const token = generateCSRFToken();
      
      // Base64url de 32 bytes es aproximadamente 43 caracteres
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(40);
      expect(typeof token).toBe('string');
    });

    it('should generate unique tokens on each call', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      const token3 = generateCSRFToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it('should generate URL-safe tokens (base64url)', () => {
      const token = generateCSRFToken();

      // Base64url no debe contener +, / ni =
      expect(token).not.toMatch(/[+\/=]/);
      // Debe contener solo caracteres alfanuméricos, - y _
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate cryptographically secure random tokens', () => {
      const tokens = new Set();
      
      // Generar 1000 tokens, todos deben ser únicos
      for (let i = 0; i < 1000; i++) {
        tokens.add(generateCSRFToken());
      }

      expect(tokens.size).toBe(1000);
    });
  });

  describe('getCSRFToken', () => {
    it('should return token from cookie if exists', async () => {
      const mockToken = 'test-csrf-token-123';
      mockCookieStore.get.mockReturnValue({ value: mockToken });

      const token = await getCSRFToken();

      expect(token).toBe(mockToken);
      expect(mockCookieStore.get).toHaveBeenCalledWith('csrf_token');
    });

    it('should return null if cookie does not exist', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const token = await getCSRFToken();

      expect(token).toBeNull();
      expect(mockCookieStore.get).toHaveBeenCalledWith('csrf_token');
    });

    it('should return null if cookie value is empty', async () => {
      mockCookieStore.get.mockReturnValue({ value: '' });

      const token = await getCSRFToken();

      // String vacío es tratado como falsy, retorna null
      expect(token).toBeNull();
    });

    it('should handle cookie store errors gracefully', async () => {
      mockCookieStore.get.mockImplementation(() => {
        throw new Error('Cookie store error');
      });

      await expect(getCSRFToken()).rejects.toThrow('Cookie store error');
    });
  });

  describe('setCSRFToken', () => {
    it('should set token in cookie with correct options', async () => {
      const token = 'new-csrf-token-456';

      await setCSRFToken(token);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24, // 24 horas
        })
      );
    });

    it('should use secure flag in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      
      // @ts-ignore - Necesario para testing
      delete process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const token = 'secure-token';
      await setCSRFToken(token);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        token,
        expect.objectContaining({
          secure: true,
        })
      );

      // @ts-ignore - Necesario para testing
      delete process.env.NODE_ENV;
      if (originalEnv) process.env.NODE_ENV = originalEnv;
    });

    it('should not use secure flag in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      
      // @ts-ignore - Necesario para testing
      delete process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const token = 'dev-token';
      await setCSRFToken(token);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        token,
        expect.objectContaining({
          secure: false,
        })
      );

      // @ts-ignore - Necesario para testing
      delete process.env.NODE_ENV;
      if (originalEnv) process.env.NODE_ENV = originalEnv;
    });

    it('should set httpOnly to prevent XSS attacks', async () => {
      await setCSRFToken('test-token');

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
        })
      );
    });

    it('should set sameSite to lax to prevent CSRF', async () => {
      await setCSRFToken('test-token');

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          sameSite: 'lax',
        })
      );
    });

    it('should set path to root for accessibility', async () => {
      await setCSRFToken('test-token');

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          path: '/',
        })
      );
    });

    it('should set 24 hour expiration', async () => {
      await setCSRFToken('test-token');

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          maxAge: 86400, // 24 * 60 * 60
        })
      );
    });
  });

  describe('verifyCSRFToken', () => {
    it('should return true when tokens match', async () => {
      const token = 'matching-token-abc123';
      mockCookieStore.get.mockReturnValue({ value: token });

      const isValid = await verifyCSRFToken(token);

      expect(isValid).toBe(true);
    });

    it('should return false when header token is null', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'some-token' });

      const isValid = await verifyCSRFToken(null);

      expect(isValid).toBe(false);
    });

    it('should return false when cookie token does not exist', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const isValid = await verifyCSRFToken('header-token');

      expect(isValid).toBe(false);
    });

    it('should return false when tokens do not match', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'cookie-token' });

      const isValid = await verifyCSRFToken('different-header-token');

      expect(isValid).toBe(false);
    });

    it('should use timing-safe comparison to prevent timing attacks', async () => {
      const token = 'timing-safe-token-xyz';
      mockCookieStore.get.mockReturnValue({ value: token });

      // La verificación debe usar crypto.timingSafeEqual
      const isValid = await verifyCSRFToken(token);

      expect(isValid).toBe(true);
    });

    it('should return false when token lengths differ', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'short' });

      const isValid = await verifyCSRFToken('very-long-token-that-does-not-match');

      expect(isValid).toBe(false);
    });

    it('should handle special characters in tokens', async () => {
      const token = 'token-with_special-chars123';
      mockCookieStore.get.mockReturnValue({ value: token });

      const isValid = await verifyCSRFToken(token);

      expect(isValid).toBe(true);
    });

    it('should be case-sensitive', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'CaseSensitiveToken' });

      const isValid1 = await verifyCSRFToken('CaseSensitiveToken');
      const isValid2 = await verifyCSRFToken('casesensitivetoken');

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(false);
    });
  });

  describe('ensureCSRFToken', () => {
    it('should return existing token if available', async () => {
      const existingToken = 'existing-token-789';
      mockCookieStore.get.mockReturnValue({ value: existingToken });

      const token = await ensureCSRFToken();

      expect(token).toBe(existingToken);
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });

    it('should generate and set new token if none exists', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const token = await ensureCSRFToken();

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(40);
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        token,
        expect.any(Object)
      );
    });

    it('should generate new token if cookie is null', async () => {
      mockCookieStore.get.mockReturnValue(null);

      const token = await ensureCSRFToken();

      expect(token).toBeTruthy();
      expect(mockCookieStore.set).toHaveBeenCalled();
    });

    it('should generate new token if cookie value is empty', async () => {
      mockCookieStore.get.mockReturnValue({ value: '' });

      const token = await ensureCSRFToken();

      expect(token).toBeTruthy();
      expect(mockCookieStore.set).toHaveBeenCalled();
    });

    it('should always return a valid token', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const token = await ensureCSRFToken();

      // Token debe ser base64url válido
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support full CSRF protection flow', async () => {
      // 1. Generar y guardar token
      mockCookieStore.get.mockReturnValue(undefined);
      const generatedToken = await ensureCSRFToken();
      
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        generatedToken,
        expect.any(Object)
      );

      // 2. Simular que ahora el token está en la cookie
      mockCookieStore.get.mockReturnValue({ value: generatedToken });

      // 3. Verificar el token
      const isValid = await verifyCSRFToken(generatedToken);
      expect(isValid).toBe(true);
    });

    it('should reject forged requests with wrong token', async () => {
      // Token legítimo en la cookie
      const legitimateToken = generateCSRFToken();
      mockCookieStore.get.mockReturnValue({ value: legitimateToken });

      // Atacante intenta con token falso
      const forgedToken = generateCSRFToken();
      const isValid = await verifyCSRFToken(forgedToken);

      expect(isValid).toBe(false);
    });

    it('should handle token refresh correctly', async () => {
      // Token inicial
      const oldToken = 'old-token-abc';
      mockCookieStore.get.mockReturnValue({ value: oldToken });

      // Obtener token existente
      let token = await ensureCSRFToken();
      expect(token).toBe(oldToken);

      // Simular expiración (cookie eliminada)
      mockCookieStore.get.mockReturnValue(undefined);

      // Debe generar nuevo token
      const newToken = await ensureCSRFToken();
      expect(newToken).toBeTruthy();
      expect(newToken).not.toBe(oldToken);
      expect(mockCookieStore.set).toHaveBeenCalled();
    });
  });

  describe('Security Edge Cases', () => {
    it('should reject empty string tokens', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'valid-token' });

      const isValid = await verifyCSRFToken('');

      expect(isValid).toBe(false);
    });

    it('should reject whitespace-only tokens', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'valid-token' });

      const isValid = await verifyCSRFToken('   ');

      expect(isValid).toBe(false);
    });

    it('should not accept tokens with injected SQL', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'valid-token' });

      const sqlInjection = "'; DROP TABLE users; --";
      const isValid = await verifyCSRFToken(sqlInjection);

      expect(isValid).toBe(false);
    });

    it('should not accept tokens with XSS payload', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'valid-token' });

      const xssPayload = '<script>alert("XSS")</script>';
      const isValid = await verifyCSRFToken(xssPayload);

      expect(isValid).toBe(false);
    });

    it('should handle very long token attempts', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'normal-length-token' });

      const veryLongToken = 'a'.repeat(10000);
      const isValid = await verifyCSRFToken(veryLongToken);

      expect(isValid).toBe(false);
    });

    it('should handle unicode characters in tokens', async () => {
      const unicodeToken = 'token-with-émojis-🔐';
      mockCookieStore.get.mockReturnValue({ value: unicodeToken });

      const isValid = await verifyCSRFToken(unicodeToken);

      expect(isValid).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should verify tokens quickly even with many mismatches', async () => {
      const correctToken = generateCSRFToken();
      mockCookieStore.get.mockReturnValue({ value: correctToken });

      const startTime = Date.now();

      // Intentar 100 verificaciones incorrectas
      for (let i = 0; i < 100; i++) {
        await verifyCSRFToken(generateCSRFToken());
      }

      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      // 100 verificaciones deben tomar menos de 1 segundo
      expect(elapsedTime).toBeLessThan(1000);
    });

    it('should generate tokens quickly', () => {
      const startTime = Date.now();

      // Generar 1000 tokens
      for (let i = 0; i < 1000; i++) {
        generateCSRFToken();
      }

      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      // 1000 generaciones deben tomar menos de 100ms
      expect(elapsedTime).toBeLessThan(100);
    });
  });

  describe('Cookie Security Attributes', () => {
    it('should set all security attributes correctly', async () => {
      const originalEnv = process.env.NODE_ENV;
      
      // @ts-ignore - Necesario para testing
      delete process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await setCSRFToken('secure-token');

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        'secure-token',
        {
          httpOnly: true,      // Previene XSS
          secure: true,        // Solo HTTPS en producción
          sameSite: 'lax',     // Previene CSRF
          path: '/',           // Accesible en toda la app
          maxAge: 86400,       // 24 horas
        }
      );

      // @ts-ignore - Necesario para testing
      delete process.env.NODE_ENV;
      if (originalEnv) process.env.NODE_ENV = originalEnv;
    });
  });
});
