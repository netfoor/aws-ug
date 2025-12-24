import { NextRequest, NextResponse } from 'next/server';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';
import { Schema } from '@/../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/lib/amplify/server-utils';
import amplifyConfig from '@/../amplify_outputs.json';

const client = generateServerClientUsingCookies<Schema>({
  config: amplifyConfig,
  cookies,
});

/**
 * 🎯 API Route: Create Event (Sin TalkProposal)
 * 
 * Crea un evento desde cero sin necesidad de propuesta.
 * Usado en /admin/events/new para eventos creados directamente por admin.
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
      title,
      description,
      eventType,
      topics,
      eventDate,
      eventTime,
      duration,
      location,
      isVirtual,
      virtualLink,
      maxAttendees,
      selectedSpeakerId,
      status = 'DRAFT',
    } = body;

    // Validación
    if (!title || !eventDate || !eventTime || !location) {
      return NextResponse.json(
        { error: 'title, eventDate, eventTime y location son requeridos' },
        { status: 400 }
      );
    }

    console.log('🎯 Creando evento desde cero:', { title, eventDate, eventTime, status });

    // Calcular fechas
    const startDateTime = new Date(`${eventDate}T${eventTime}:00.000Z`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
    const now = new Date().toISOString();

    // Generar slug único
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const slug = `${baseSlug}-${randomSuffix}`;

    // Obtener datos del speaker si se seleccionó uno
    let speakerData = {
      speakerId: '',
      speakerName: 'Por definir',
      speakerEmail: '',
    };

    if (selectedSpeakerId) {
      try {
        const { data: speakerApp } = await client.models.SpeakerApplication.get({ id: selectedSpeakerId });
        if (speakerApp) {
          speakerData = {
            speakerId: speakerApp.userId,
            speakerName: speakerApp.userId, // Temporalmente usamos userId, se actualizará con nombre real
            speakerEmail: speakerApp.email || '',
          };
        }
      } catch (speakerError) {
        console.error('Error obteniendo speaker:', speakerError);
      }
    }

    // Crear evento
    const { data: createdEvent, errors } = await client.models.Event.create({
      title,
      description: description || '',
      slug,
      eventType,
      topics: topics || [],
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      timezone: 'America/Mexico_City',
      location: isVirtual ? 'Virtual' : location,
      isVirtual: isVirtual || false,
      virtualLink: isVirtual ? virtualLink : undefined,
      maxAttendees: maxAttendees || null,
      status,
      isPublic: true,
      requiresApproval: false,
      createdBy: session.tokens.accessToken.payload.sub as string,
      createdAt: now,
      publishedAt: status === 'PUBLISHED' ? now : undefined,
      goingCount: 0,
      checkedInCount: 0,
      invitedCount: 0,
      notGoingCount: 0,
      speakerId: speakerData.speakerId,
      speakerName: speakerData.speakerName,
      speakerEmail: speakerData.speakerEmail,
      // coverImageUrl se agregará después de que se suba la imagen
    });

    if (errors || !createdEvent) {
      console.error('Error creando evento:', errors);
      return NextResponse.json(
        { error: 'Error al crear el evento' },
        { status: 500 }
      );
    }

    console.log('✅ Evento creado:', createdEvent.id);

    // Si hay speaker, notificarlo
    if (selectedSpeakerId) {
      try {
        await client.models.Notification.create({
          userId: selectedSpeakerId,
          type: 'NEW_EVENT',
          title: '🎉 Nuevo evento creado',
          message: `Se ha creado el evento "${title}" con tu participación como speaker.`,
          read: false,
          link: `/events/${slug}`,
          icon: '📅',
          createdAt: now,
          owner: selectedSpeakerId,
        });
      } catch (notifError) {
        console.error('Error enviando notificación:', notifError);
        // No bloquear si falla la notificación
      }
    }

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        slug: createdEvent.slug,
        title: createdEvent.title,
        status: createdEvent.status,
      }
    });

  } catch (error) {
    console.error('Error en create-event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
