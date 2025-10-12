/**
 * Simple in-memory rate limiter
 * Para producción, considerar usar Redis o un servicio como Upstash
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Limpiar entradas expiradas cada 5 minutos
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Verifica si una IP ha excedido el límite de requests
   */
  check(identifier: string): { allowed: boolean; limit: number; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // Si no existe o ha expirado, crear nueva entrada
    if (!entry || now > entry.resetTime) {
      const resetTime = now + this.windowMs;
      this.requests.set(identifier, { count: 1, resetTime });
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetTime,
      };
    }

    // Incrementar contador
    entry.count++;

    // Verificar si excede el límite
    if (entry.count > this.maxRequests) {
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Limpia entradas expiradas para liberar memoria
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Reinicia el contador para un identificador específico
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Instancia singleton para rate limiting de autenticación
// 100 requests por minuto por IP
export const authRateLimiter = new RateLimiter(100, 60000);

// Rate limiter más estricto para operaciones sensibles (login attempts)
// 10 intentos por 15 minutos por IP
export const loginRateLimiter = new RateLimiter(10, 15 * 60 * 1000);
