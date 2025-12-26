import { NextRequest, NextResponse } from 'next/server';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';
import { Schema } from '@/../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify/server-utils';
import amplifyConfig from '@/../amplify_outputs.json';

const client = generateServerClientUsingCookies<Schema>({
  config: amplifyConfig,
  cookies,
});

/**
 * 🎯 API Route: Create and Publish Event from TalkProposal
 * 
 * Crea un evento DRAFT o PUBLISHED directamente desde una TalkProposal aprobada.
 * Se usa en el wizard inline del dashboard para completar el flujo en un solo lugar.
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
    const { 
      talkProposalId,
      speakerApplicationId, // Para actualizar attachedProposal si la fecha cambió
      eventDate,
      eventTime,
      location,
      capacity,
      coverImageUrl, // Cover image path de S3
      publish = false, // Si es true, crea como PUBLISHED, sino DRAFT
    } = body;

    if (!talkProposalId || !eventDate || !eventTime || !location) {
      return NextResponse.json(
        { error: 'talkProposalId, eventDate, eventTime y location son requeridos' },
        { status: 400 }
      );
    }


    // 1. Obtener datos de la TalkProposal
    const proposalResponse = await client.models.TalkProposal.get({ id: talkProposalId });
    
    if (!proposalResponse.data) {
      return NextResponse.json(
        { error: 'TalkProposal no encontrada' },
        { status: 404 }
      );
    }

    const proposal = proposalResponse.data;

    // Validar que la propuesta esté pendiente (no aprobada todavía)
    if (proposal.status !== 'PENDING' && proposal.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `La propuesta debe estar PENDING o APPROVED. Estado actual: ${proposal.status}` },
        { status: 400 }
      );
    }

    // 1.5. Aprobar la propuesta primero (si está PENDING)
    if (proposal.status === 'PENDING') {
      await client.models.TalkProposal.update({
        id: talkProposalId,
        status: 'APPROVED',
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Crear el evento con los datos de la propuesta
    const eventDateTime = `${eventDate}T${eventTime}:00.000Z`;
    const now = new Date().toISOString();
    
    // Calculate end date (assume 1 hour duration for now)
    const startDate = new Date(eventDateTime);
    const endDate = new Date(startDate.getTime() + (proposal.duration || 60) * 60 * 1000);
    
    // Generate slug from title
    const slug = proposal.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + `-${Date.now()}`;

    const eventData = {
      title: proposal.title,
      description: proposal.description || '',
      slug,
      topics: proposal.topics || [],
      startDate: eventDateTime,
      endDate: endDate.toISOString(),
      location,
      maxAttendees: capacity || 50,
      coverImageUrl: coverImageUrl || undefined, // Cover image si existe
      status: publish ? ('PUBLISHED' as const) : ('DRAFT' as const),
      speakerId: proposal.userId,
      speakerName: proposal.speakerName || 'Speaker',
      speakerEmail: proposal.speakerEmail || '',
      talkProposalId: proposal.id,
      createdBy: session.tokens!.accessToken.payload.sub as string,
      createdAt: now,
      updatedAt: now,
    };

    const eventResponse = await client.models.Event.create(eventData);

    if (!eventResponse.data) {
      return NextResponse.json(
        { error: 'Error al crear evento' },
        { status: 500 }
      );
    }

    const event = eventResponse.data;

    // 3. Si se publicó, actualizar status de la propuesta a EVENT_CREATED
    if (publish) {
      await client.models.TalkProposal.update({
        id: talkProposalId,
        status: 'EVENT_CREATED',
        eventId: event.id,
        proposedDate: eventDateTime, // ✅ ACTUALIZAR fecha si cambió
        updatedAt: now,
      });
    }

    // 4. Actualizar SpeakerApplication.attachedProposal.proposedDate si cambió la fecha
    if (speakerApplicationId) {
      try {
        const appResponse = await client.models.SpeakerApplication.get({ id: speakerApplicationId });
        
        if (appResponse.data && appResponse.data.attachedProposal) {
          const attachedProposal = typeof appResponse.data.attachedProposal === 'string'
            ? JSON.parse(appResponse.data.attachedProposal)
            : appResponse.data.attachedProposal;

          const originalDate = attachedProposal.proposedDate;
          
          if (originalDate !== eventDateTime) {
            // La fecha cambió, actualizar attachedProposal
            const updatedProposal = {
              ...attachedProposal,
              proposedDate: eventDateTime,
            };

            await client.models.SpeakerApplication.update({
              id: speakerApplicationId,
              attachedProposal: JSON.stringify(updatedProposal),
            });
          }
        }
      } catch (err) {
        console.error('⚠️ Error actualizando SpeakerApplication:', err);
        // No lanzar error, continuar con el flujo
      }
    }

    return NextResponse.json({
      success: true,
      message: publish ? 'Evento creado y publicado' : 'Evento creado en borrador',
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        status: event.status,
      },
      published: publish,
    });
  } catch (error) {
    console.error('❌ Error al crear evento:', error);
    return NextResponse.json(
      {
        error: 'Error al crear evento',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
