/**
 * API Route: Rechazar Speaker (Admin)
 * 
 * Invoca la Lambda reject-speaker-application para rechazar una postulación.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify/server-utils';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ Verificar autenticación y permisos de admin
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    });

    if (!session.tokens) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const groups = session.tokens.accessToken.payload['cognito:groups'] as string[] || [];
    if (!groups.includes('ADMINS')) {
      return NextResponse.json(
        { error: 'No tienes permisos de administrador' },
        { status: 403 }
      );
    }

    // 2️⃣ Obtener datos del request
    const { applicationId, userId, rejectionReason, rejectedBy } = await request.json();

    if (!applicationId || !userId || !rejectionReason) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: applicationId, userId, rejectionReason' },
        { status: 400 }
      );
    }

    // 3️⃣ Invocar Lambda reject-speaker-application
    // El nombre viene de amplify_outputs.json (generado por Amplify)
    const outputs = await import('../../../../../amplify_outputs.json') as { custom?: { rejectSpeakerLambdaName?: string } };
    const lambdaFunctionName = outputs.custom?.rejectSpeakerLambdaName;
    
    if (!lambdaFunctionName) {
      return NextResponse.json(
        {
          error: 'Lambda reject-speaker no encontrada en amplify_outputs.json',
          hint: 'Ejecuta "npx ampx sandbox" para generar amplify_outputs.json con los nombres de las Lambdas',
        },
        { status: 501 }
      );
    }
    
    const payload = {
      applicationId,
      userId,
      rejectionReason,
      rejectedBy: rejectedBy || session.tokens.accessToken.payload.sub,
    };


    const command = new InvokeCommand({
      FunctionName: lambdaFunctionName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload),
    });

    let response;
    try {
      response = await lambdaClient.send(command);
    } catch (awsErr: unknown) {
      console.error('❌ Error invoking Lambda:', awsErr);
      const error = awsErr as { name?: string; Code?: string; message?: string };
      if (error.name === 'ResourceNotFoundException' || error.Code === 'ResourceNotFoundException') {
        return NextResponse.json(
          { error: 'Lambda no encontrada', details: error.message },
          { status: 502 }
        );
      }
      return NextResponse.json(
        { error: 'Error al invocar la Lambda', details: error.message || String(awsErr) },
        { status: 502 }
      );
    }

    // Intentar decodificar el payload de la Lambda (puede ser vacío)
    let result: unknown = null;
    try {
      if (response.Payload) {
        const decoded = new TextDecoder().decode(response.Payload);
        result = decoded ? JSON.parse(decoded) : null;
      }
    } catch (parseErr) {
      console.warn('⚠️ No se pudo parsear payload de Lambda:', parseErr);
      result = { raw: response.Payload ? new TextDecoder().decode(response.Payload) : null };
    }


    // 4️⃣ Verificar si hubo error en la Lambda (FunctionError indica excepción dentro de la Lambda)
    if (response.FunctionError) {
      console.error('❌ Lambda internal error:', result);
      return NextResponse.json(
        { error: 'Error interno en la Lambda', details: result },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Postulación rechazada exitosamente',
      result,
    });

  } catch (error) {
    console.error('❌ Error en API route:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
