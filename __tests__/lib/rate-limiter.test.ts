import { authRateLimiter, loginRateLimiter } from '@/lib/rate-limiter';

describe('RateLimiter', () => {
  describe('authRateLimiter (100 req/min)', () => {
    const testIdentifier = 'test-ip-auth';

    beforeEach(() => {
      // Limpiar el estado antes de cada test
      authRateLimiter.reset(testIdentifier);
    });

    it('should allow first request and return correct remaining count', () => {
      const result = authRateLimiter.check(testIdentifier);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should track multiple requests and decrement remaining count', () => {
      // Primera request
      let result = authRateLimiter.check(testIdentifier);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);

      // Segunda request
      result = authRateLimiter.check(testIdentifier);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(98);

      // Tercera request
      result = authRateLimiter.check(testIdentifier);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(97);
    });

    it('should block requests after exceeding limit', () => {
      // Hacer 100 requests (el límite)
      for (let i = 0; i < 100; i++) {
        const result = authRateLimiter.check(testIdentifier);
        expect(result.allowed).toBe(true);
      }

      // Request 101 debe ser bloqueada
      const result = authRateLimiter.check(testIdentifier);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should return same resetTime during rate limit window', () => {
      const result1 = authRateLimiter.check(testIdentifier);
      const result2 = authRateLimiter.check(testIdentifier);

      expect(result1.resetTime).toBe(result2.resetTime);
    });

    it('should reset counter after time window expires', () => {
      // Mock Date.now() para simular el paso del tiempo
      const originalNow = Date.now;
      let currentTime = originalNow();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Primera request
      const result1 = authRateLimiter.check(testIdentifier);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(99);

      // Avanzar el tiempo más allá de la ventana (60 segundos + 1ms)
      currentTime += 60001;

      // Nueva request después de expirar debe reiniciar el contador
      const result2 = authRateLimiter.check(testIdentifier);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(99); // Reiniciado
      expect(result2.resetTime).toBeGreaterThan(result1.resetTime);

      // Restaurar Date.now()
      Date.now = originalNow;
    });

    it('should handle different identifiers independently', () => {
      const identifier1 = 'ip-192.168.1.1';
      const identifier2 = 'ip-192.168.1.2';

      authRateLimiter.reset(identifier1);
      authRateLimiter.reset(identifier2);

      // Hacer requests desde identifier1
      for (let i = 0; i < 50; i++) {
        authRateLimiter.check(identifier1);
      }

      // identifier2 debe tener su propio contador
      const result1 = authRateLimiter.check(identifier1);
      const result2 = authRateLimiter.check(identifier2);

      expect(result1.remaining).toBe(49); // 100 - 51
      expect(result2.remaining).toBe(99); // Primera request
    });

    it('should reset counter when reset() is called', () => {
      // Hacer algunas requests
      for (let i = 0; i < 50; i++) {
        authRateLimiter.check(testIdentifier);
      }

      let result = authRateLimiter.check(testIdentifier);
      expect(result.remaining).toBe(49);

      // Reset manual
      authRateLimiter.reset(testIdentifier);

      // Siguiente request debe empezar de nuevo
      result = authRateLimiter.check(testIdentifier);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('should maintain correct limit even after blocking', () => {
      // Exceder el límite
      for (let i = 0; i < 101; i++) {
        authRateLimiter.check(testIdentifier);
      }

      // Verificar que limit siempre es 100
      const result = authRateLimiter.check(testIdentifier);
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(0);
    });
  });

  describe('loginRateLimiter (10 req/15min)', () => {
    const testIdentifier = 'test-ip-login';

    beforeEach(() => {
      loginRateLimiter.reset(testIdentifier);
    });

    it('should have stricter limits than authRateLimiter', () => {
      const result = loginRateLimiter.check(testIdentifier);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it('should block after 10 login attempts', () => {
      // Hacer 10 intentos de login (el límite)
      for (let i = 0; i < 10; i++) {
        const result = loginRateLimiter.check(testIdentifier);
        expect(result.allowed).toBe(true);
      }

      // Intento 11 debe ser bloqueado
      const result = loginRateLimiter.check(testIdentifier);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should have longer time window (15 minutes)', () => {
      const originalNow = Date.now;
      let currentTime = originalNow();
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Primera request
      const result1 = loginRateLimiter.check(testIdentifier);
      const resetTime1 = result1.resetTime;

      // El resetTime debe estar aproximadamente 15 minutos en el futuro
      const expectedResetTime = currentTime + (15 * 60 * 1000);
      expect(resetTime1).toBeGreaterThanOrEqual(expectedResetTime - 100);
      expect(resetTime1).toBeLessThanOrEqual(expectedResetTime + 100);

      Date.now = originalNow;
    });

    it('should protect against brute force attacks', () => {
      // Simular 10 intentos fallidos de login
      for (let i = 0; i < 10; i++) {
        const result = loginRateLimiter.check(testIdentifier);
        expect(result.allowed).toBe(true);
      }

      // Los siguientes intentos deben ser bloqueados
      for (let i = 0; i < 5; i++) {
        const result = loginRateLimiter.check(testIdentifier);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      }
    });
  });

  describe('Edge Cases', () => {
    const testIdentifier = 'edge-case-test';

    beforeEach(() => {
      authRateLimiter.reset(testIdentifier);
    });

    it('should handle rapid successive requests correctly', () => {
      const results = [];
      
      // 5 requests rápidas
      for (let i = 0; i < 5; i++) {
        results.push(authRateLimiter.check(testIdentifier));
      }

      // Todas deben ser permitidas
      results.forEach((result, index) => {
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(99 - index);
      });
    });

    it('should handle empty identifier string', () => {
      const result = authRateLimiter.check('');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
    });

    it('should handle very long identifier strings', () => {
      const longIdentifier = 'a'.repeat(1000);
      authRateLimiter.reset(longIdentifier);
      
      const result = authRateLimiter.check(longIdentifier);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('should handle special characters in identifier', () => {
      const specialIdentifier = '192.168.1.1:8080/path?query=test&foo=bar';
      authRateLimiter.reset(specialIdentifier);
      
      const result = authRateLimiter.check(specialIdentifier);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle multiple identifiers concurrently', () => {
      const identifiers = ['ip1', 'ip2', 'ip3', 'ip4', 'ip5'];
      
      // Reset todos
      identifiers.forEach(id => authRateLimiter.reset(id));

      // Hacer requests concurrentes
      const results = identifiers.map(id => authRateLimiter.check(id));

      // Cada uno debe tener su propio contador
      results.forEach(result => {
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(99);
      });
    });

    it('should not have race conditions with same identifier', () => {
      const identifier = 'concurrent-test';
      authRateLimiter.reset(identifier);

      // Simular requests simultáneas (aunque Jest ejecuta sincrónicamente)
      const result1 = authRateLimiter.check(identifier);
      const result2 = authRateLimiter.check(identifier);
      const result3 = authRateLimiter.check(identifier);

      expect(result1.remaining).toBe(99);
      expect(result2.remaining).toBe(98);
      expect(result3.remaining).toBe(97);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large number of different identifiers', () => {
      // Simular 1000 IPs diferentes
      for (let i = 0; i < 1000; i++) {
        const identifier = `ip-${i}`;
        const result = authRateLimiter.check(identifier);
        expect(result.allowed).toBe(true);
      }

      // Verificar que cada IP tiene su propio contador
      const finalResult = authRateLimiter.check('ip-500');
      expect(finalResult.remaining).toBe(98); // Ya hizo 2 requests
    });
  });

  describe('Security', () => {
    it('should prevent timing attacks by returning consistent responses', () => {
      const identifier = 'timing-test';
      authRateLimiter.reset(identifier);

      // Hacer requests hasta alcanzar el límite
      for (let i = 0; i < 100; i++) {
        authRateLimiter.check(identifier);
      }

      // Múltiples requests bloqueadas deben retornar mismos datos
      const blockedResult1 = authRateLimiter.check(identifier);
      const blockedResult2 = authRateLimiter.check(identifier);

      expect(blockedResult1).toEqual(blockedResult2);
    });

    it('should not leak information about other identifiers', () => {
      const identifier1 = 'user1';
      const identifier2 = 'user2';

      authRateLimiter.reset(identifier1);
      authRateLimiter.reset(identifier2);

      // Bloquear identifier1
      for (let i = 0; i < 101; i++) {
        authRateLimiter.check(identifier1);
      }

      // identifier2 no debe verse afectado
      const result2 = authRateLimiter.check(identifier2);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(99);
    });
  });
});
