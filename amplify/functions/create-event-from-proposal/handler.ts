import type { Schema } from '../../data/resource';

type TalkProposal = Schema['TalkProposal']['type'];
type Event = Schema['Event']['type'];

export const handler = async (event: any) => {
  console.log('Lambda invoked with event:', JSON.stringify(event, null, 2));

  try {
    const { proposalId, eventDetails } = JSON.parse(event.body || '{}');

    if (!proposalId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'proposalId is required' }),
      };
    }

    // TODO: Aquí se integraría con Amplify Data para:
    // 1. Obtener la propuesta aprobada
    // 2. Crear el evento con los datos de la propuesta + eventDetails
    // 3. Actualizar la propuesta con status EVENT_CREATED y eventId
    // 4. Retornar el evento creado

    // Por ahora retornamos mock data para testing
    const mockEvent = {
      id: `evt_${Date.now()}`,
      title: eventDetails.title || 'Evento desde propuesta',
      slug: eventDetails.slug || `event-${proposalId}`,
      description: eventDetails.description || 'Descripción del evento',
      talkProposalId: proposalId,
      speakerId: eventDetails.speakerId,
      speakerName: eventDetails.speakerName,
      speakerEmail: eventDetails.speakerEmail,
      eventType: 'TALK',
      topics: eventDetails.topics || [],
      startDate: eventDetails.startDate,
      endDate: eventDetails.endDate,
      timezone: 'America/Mexico_City',
      location: eventDetails.location,
      maxAttendees: eventDetails.maxAttendees || null,
      status: 'DRAFT',
      isPublic: true,
      createdBy: event.requestContext?.authorizer?.claims?.sub || 'system',
      createdAt: new Date().toISOString(),
      goingCount: 0,
      checkedInCount: 0,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        event: mockEvent,
        message: 'Evento creado exitosamente (mock)',
      }),
    };
  } catch (error) {
    console.error('Error creating event:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Error al crear evento',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
