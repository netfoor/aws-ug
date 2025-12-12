'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { ChevronRight, Calendar } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../../amplify/data/resource';
import EventCardMinimal from '@/components/events/EventCardMinimal';

const client = generateClient<Schema>();

type EventType = Schema['Event']['type'];

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      const { data } = await client.models.Event.list({
        filter: {
          status: { eq: 'PUBLISHED' },
          ...(filter === 'upcoming' 
            ? { startDate: { ge: now } }
            : { startDate: { lt: now } }
          )
        },
        limit: 10,
      });

      // Sort by date
      const sorted = [...(data || [])].sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return filter === 'upcoming' ? dateA - dateB : dateB - dateA;
      });

      setEvents(sorted);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-12 px-4">
      <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-10 h-10 text-accent" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {filter === 'upcoming' ? 'No hay eventos próximos' : 'No hay eventos pasados'}
      </h3>
      <p className="text-sm text-text-secondary mb-6">
        {filter === 'upcoming' 
          ? 'Los eventos serán publicados aquí cuando estén disponibles.' 
          : 'Aún no hemos tenido eventos registrados.'}
      </p>
      {filter === 'upcoming' && (
        <button
          onClick={() => setFilter('past')}
          className="text-accent text-sm font-medium hover:underline"
        >
          Ver eventos pasados →
        </button>
      )}
    </div>
  );

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-4 py-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 flex gap-3 animate-pulse">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 bg-border-light rounded" />
            <div className="h-4 w-3/4 bg-border-light rounded" />
            <div className="h-3 w-32 bg-border-light rounded" />
            <div className="h-3 w-24 bg-border-light rounded" />
          </div>
          <div className="w-20 h-20 bg-border-light rounded-xl flex-shrink-0 mt-6" />
        </div>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border-light backdrop-blur-sm bg-opacity-95">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-text-primary">Tus Eventos</h1>
            <Link 
              href="/events"
              className="text-sm font-medium text-accent flex items-center gap-1 hover:underline"
            >
              Ver todos
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('upcoming')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                filter === 'upcoming'
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'bg-transparent text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                📅 Próximos
              </span>
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                filter === 'past'
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'bg-transparent text-text-secondary hover:bg-surface-hover'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                🕐 Pasados
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-2xl mx-auto px-4">
        {loading ? (
          <LoadingSkeleton />
        ) : events.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4 py-4">
            {events.map((event) => (
              <EventCardMinimal
                key={event.id}
                id={event.id ?? ''}
                title={event.title}
                slug={event.slug}
                coverImageUrl={event.coverImageUrl ?? undefined}
                speakerName={event.speakerName}
                speakerAvatar={event.speakerAvatar ?? undefined}
                startDate={event.startDate}
                location={event.location}
                isVirtual={event.isVirtual ?? false}
                goingCount={event.goingCount ?? 0}
                maxAttendees={event.maxAttendees ?? undefined}
                isUnlimited={event.isUnlimited ?? false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Info Banner (solo si NO está autenticado) */}
      {!isAuthenticated && (
        <div className="fixed bottom-0 left-0 right-0 bg-accent text-white p-4 shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm font-medium">
              ✨ Únete a la comunidad AWS Puebla
            </p>
            <Link 
              href="/auth/signin"
              className="px-4 py-2 bg-white text-accent rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors whitespace-nowrap"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
