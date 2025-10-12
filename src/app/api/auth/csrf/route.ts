/**
 * CSRF Token Endpoint
 * 
 * Proporciona un token CSRF a los clientes para proteger operaciones que modifican estado
 * El token se almacena en una cookie httpOnly y también se retorna en el response
 */

import { NextResponse } from 'next/server';
import { ensureCSRFToken } from '@/lib/csrf';

export async function GET() {
  try {
    const token = await ensureCSRFToken();
    
    return NextResponse.json({
      csrfToken: token,
      message: 'CSRF token generated successfully',
    });
  } catch (error) {
    console.error('Error generating CSRF token:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error,
    });
    
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
