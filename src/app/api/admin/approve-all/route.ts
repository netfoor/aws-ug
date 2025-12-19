import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify/server-utils';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * 🎯 API Route: Approve All (Speaker + Proposal + Event)
 * 
 * Flujo completo unificado que:
 * 1. Aprueba al speaker (llama a manual-approve-speaker Lambda directamente)
 * 2. La Lambda ya crea automáticamente la TalkProposal si hay attachedProposal
 * 3. Retorna IDs de todo lo creado
 * 
 * Este endpoint orquesta el flujo completo para minimizar clics del admin.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
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

    const body = await request.json();
    const { applicationId, userId, approvedBy } = body;

    if (!applicationId || !userId) {
      return NextResponse.json(
        { error: 'applicationId y userId son requeridos' },
        { status: 400 }
      );
    }

    console.log('🚀 Iniciando aprobación completa:', { applicationId, userId, approvedBy });

    // STEP 1: Invocar Lambda manual-approve-speaker directamente
    const outputs = await import('../../../../../amplify_outputs.json') as { custom?: { manualApproveLambdaName?: string } };
    const lambdaFunctionName = outputs.custom?.manualApproveLambdaName;
    
    if (!lambdaFunctionName) {
      return NextResponse.json(
        { error: 'Lambda no encontrada en amplify_outputs.json' },
        { status: 501 }
      );
    }

    const payload = {
      applicationId,
      userId,
      approvedBy: approvedBy || session.tokens.accessToken.payload.sub,
    };

    const command = new InvokeCommand({
      FunctionName: lambdaFunctionName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload),
    });

    console.log('📡 Invocando Lambda:', lambdaFunctionName, 'con payload:', payload);

    const response = await lambdaClient.send(command);
    
    // Verificar si la Lambda tuvo un error
    if (response.FunctionError) {
      console.error('❌ Lambda retornó error:', response.FunctionError);
      const errorPayload = response.Payload ? new TextDecoder().decode(response.Payload) : 'Sin detalles';
      console.error('Error payload:', errorPayload);
      
      return NextResponse.json(
        {
          error: 'La Lambda falló al procesar la aprobación',
          details: errorPayload,
          lambdaError: response.FunctionError,
        },
        { status: 500 }
      );
    }
    
    let approveResult: { statusCode?: number; body?: string; message?: string; talkProposalCreated?: boolean; talkProposalId?: string } = {};
    if (response.Payload) {
      const decoded = new TextDecoder().decode(response.Payload);
      const lambdaResponse = decoded ? JSON.parse(decoded) : {};
      // Lambda retorna { statusCode, body } donde body es un string JSON
      approveResult = lambdaResponse.body ? JSON.parse(lambdaResponse.body) : lambdaResponse;
      console.log('📦 Respuesta de Lambda:', JSON.stringify(approveResult, null, 2));
    }

    // Verificar si la Lambda retornó un error en el body
    if (approveResult.statusCode && approveResult.statusCode >= 400) {
      console.error('❌ Lambda retornó statusCode de error:', approveResult.statusCode);
      return NextResponse.json(
        {
          error: 'Error al aprobar speaker',
          details: approveResult.body || approveResult.message || 'Error desconocido',
          statusCode: approveResult.statusCode,
        },
        { status: approveResult.statusCode }
      );
    }

    console.log('✅ Speaker aprobado exitosamente');

    // STEP 2: Si se creó una TalkProposal, crear el evento en borrador
    const eventId = null;
    if (approveResult.talkProposalCreated && approveResult.talkProposalId) {
      console.log('🎯 Creando evento desde propuesta:', approveResult.talkProposalId);
      
      // Obtener los datos de la propuesta para crear el evento
      // Por ahora retornamos indicando que se debe crear manualmente
      // TODO: Implementar creación automática de evento
      console.log('ℹ️ Evento debe ser creado desde /admin/talk-proposals');
    }

    return NextResponse.json({
      success: true,
      message: 'Flujo completo ejecutado',
      speakerApproved: true,
      talkProposalCreated: approveResult.talkProposalCreated || false,
      talkProposalId: approveResult.talkProposalId || null,
      eventCreated: false, // Por ahora false, se puede automatizar después
      eventId,
      details: {
        applicationId,
        userId,
        approvedBy,
      },
    });
  } catch (error) {
    console.error('❌ Error en approve-all:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar la aprobación completa',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
