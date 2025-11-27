/**
 * API Route: Aprobar Speaker (Admin)
 * 
 * Invoca la Lambda manual-approve-speaker para aprobar una postulación.
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
    const { applicationId, userId, approvedBy } = await request.json();

    if (!applicationId || !userId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: applicationId, userId' },
        { status: 400 }
      );
    }

    // 3️⃣ Invocar Lambda manual-approve-speaker
    // Buscar el nombre real de la Lambda (incluye sufijo de Amplify)
    const lambdaFunctionName = process.env.MANUAL_APPROVE_LAMBDA_NAME || 'amplify-awsug-netfoor-san-manualapprovespeakerlamb-ksX01gEOYtiN';
    
    const payload = {
      applicationId,
      userId,
      approvedBy: approvedBy || session.tokens.accessToken.payload.sub,
    };

    console.log('🎯 Invocando Lambda:', lambdaFunctionName, payload);

    const command = new InvokeCommand({
      FunctionName: lambdaFunctionName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload),
    });

    const response = await lambdaClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));

    console.log('✅ Lambda response:', result);

    // 4️⃣ Verificar si hubo error en la Lambda
    if (response.FunctionError) {
      console.error('❌ Lambda error:', result);
      return NextResponse.json(
        { error: 'Error al ejecutar la aprobación', details: result },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Postulación aprobada exitosamente',
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
