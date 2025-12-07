/**
 * API Route: Notificar Admins - Nueva Propuesta
 * 
 * Invoca la Lambda notify-admins-new-proposal cuando un speaker envía una propuesta.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify/server-utils';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ Verificar autenticación (cualquier usuario autenticado puede notificar)
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

    // 2️⃣ Obtener datos del request
    const { proposalId, speakerName, title } = await request.json();

    if (!proposalId || !speakerName || !title) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: proposalId, speakerName, title' },
        { status: 400 }
      );
    }

    // 3️⃣ Invocar Lambda notify-admins-new-proposal
    const outputs = await import('../../../../../amplify_outputs.json') as any;
    const lambdaFunctionName = outputs.custom?.notifyAdminsNewProposalLambdaName;
    
    if (!lambdaFunctionName) {
      console.warn('⚠️  Lambda notify-admins-new-proposal no encontrada en amplify_outputs.json');
      // No fallar el request, solo log warning
      return NextResponse.json(
        {
          success: true,
          warning: 'Lambda de notificación no configurada (sandbox no desplegado)',
        },
        { status: 200 }
      );
    }

    // 4️⃣ Preparar payload para la Lambda
    const payload = {
      proposalId,
      speakerName,
      title,
    };

    console.log(`🔔 Invocando Lambda ${lambdaFunctionName} para notificar admins...`);
    console.log('Payload:', payload);

    // 5️⃣ Invocar Lambda
    const command = new InvokeCommand({
      FunctionName: lambdaFunctionName,
      Payload: JSON.stringify(payload),
    });

    const response = await lambdaClient.send(command);
    
    // 6️⃣ Parsear respuesta
    const responsePayload = JSON.parse(
      new TextDecoder().decode(response.Payload)
    );

    console.log('Lambda response:', responsePayload);

    // Verificar si la Lambda devolvió error
    if (response.FunctionError || responsePayload.statusCode !== 200) {
      console.error('❌ Error en Lambda:', responsePayload);
      return NextResponse.json(
        {
          error: 'Error al enviar notificaciones',
          details: responsePayload.body,
        },
        { status: 500 }
      );
    }

    // 7️⃣ Éxito
    const lambdaBody = JSON.parse(responsePayload.body);
    return NextResponse.json({
      success: true,
      message: 'Notificaciones enviadas a administradores',
      ...lambdaBody,
    });

  } catch (error) {
    console.error('❌ Error en API route notify-admins:', error);
    
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
