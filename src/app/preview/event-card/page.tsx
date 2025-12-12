'use client';

import React from 'react';
import EventCardMinimal from '@/components/events/EventCardMinimal';

/**
 * 🎨 PREVIEW PAGE - EventCard Minimalista Mobile-First
 * 
 * Esta página muestra ejemplos del nuevo EventCard en diferentes estados:
 * - Con imagen
 * - Sin imagen (fallback)
 * - Evento lleno
 * - Últimos lugares
 * - Virtual vs Presencial
 */
export default function EventCardPreviewPage() {
  // Ejemplo de eventos
  const sampleEvents = [
    {
      id: '1',
      title: 'AWS Community Day Puebla 2025',
      slug: 'aws-community-day-2025',
      coverImageUrl: '/Logo.png', // Usamos el logo como ejemplo
      speakerName: 'Fortino Romero',
      speakerAvatar: undefined,
      startDate: new Date('2025-12-15T10:00:00').toISOString(),
      location: 'BUAP - Edificio Central',
      isVirtual: false,
      goingCount: 250,
      maxAttendees: 300,
      isUnlimited: false,
    },
    {
      id: '2',
      title: 'Introducción a Serverless con AWS Lambda y DynamoDB',
      slug: 'intro-serverless-lambda',
      coverImageUrl: undefined, // Sin imagen
      speakerName: 'María González',
      speakerAvatar: undefined,
      startDate: new Date('2025-12-22T14:00:00').toISOString(),
      location: 'Online',
      isVirtual: true,
      goingCount: 45,
      maxAttendees: 50,
      isUnlimited: false,
    },
    {
      id: '3',
      title: 'Workshop: CI/CD con GitHub Actions y AWS',
      slug: 'workshop-cicd-github-aws',
      coverImageUrl: undefined,
      speakerName: 'Carlos Hernández',
      speakerAvatar: undefined,
      startDate: new Date('2026-01-10T16:00:00').toISOString(),
      location: 'TEC Milenio Campus Puebla',
      isVirtual: false,
      goingCount: 30,
      maxAttendees: 30,
      isUnlimited: false,
    },
    {
      id: '4',
      title: 'Arquitecturas Escalables con AWS: De Monolito a Microservicios',
      slug: 'arquitecturas-escalables-microservicios',
      coverImageUrl: undefined,
      speakerName: 'Ana Martínez',
      speakerAvatar: undefined,
      startDate: new Date('2026-01-15T18:00:00').toISOString(),
      location: 'Google Cloud Office',
      isVirtual: false,
      goingCount: 120,
      maxAttendees: undefined,
      isUnlimited: true,
    },
  ];

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            🎨 EventCard Minimalista
          </h1>
          <p className="text-text-secondary">
            Diseño mobile-first optimizado para la nueva home page
          </p>
        </div>

        {/* Preview Container - Simula mobile width */}
        <div className="max-w-sm mx-auto space-y-4">
          {sampleEvents.map((event) => (
            <EventCardMinimal key={event.id} {...event} />
          ))}
        </div>

        {/* Info */}
        <div className="max-w-sm mx-auto bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-8">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            ✨ Características
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Bordes redondeados (rounded-2xl)</li>
            <li>• Foto del speaker (6x6) con inicial si no hay avatar</li>
            <li>• Título en negritas limitado a 2 líneas</li>
            <li>• Hora con icono de reloj</li>
            <li>• Lugar con icono de mapa</li>
            <li>• Contador de asistentes</li>
            <li>• Badges de estado (Lleno, Últimos lugares)</li>
            <li>• Hover effect suave</li>
            <li>• Optimizado para mobile (320px+)</li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="max-w-sm mx-auto pt-6">
          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>
    </main>
  );
}
