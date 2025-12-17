'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { ChevronRight, Calendar } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../../amplify/data/resource';
import EventCardMinimal from '@/components/events/EventCardMinimal';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { TalaveraPattern } from '@/components/ui/TalaveraPattern';

const client = generateClient<Schema>();

type EventType = Schema['Event']['type'];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  const fetchEvents = useCallback(async () => {
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
  }, [filter]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [filter, isAuthenticated, fetchEvents]);

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

  // Si NO está autenticado, mostrar Landing Page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen theme-transition">
        {/* Hero Section */}
        <section className="relative py-20 px-4 pb-38 overflow-hidden bg-gradient-to-br from-background via-surface to-primary/10">
          <TalaveraPattern variant="background" />
          
          {/* Talavera borders */}
          <div 
            className="absolute top-0 left-0 right-0 h-16 opacity-30 pointer-events-none"
            style={{
              backgroundImage: 'url(/talavera.png)',
              backgroundRepeat: 'repeat-x',
              backgroundSize: '240px auto'
            }}
          ></div>
          <div 
            className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none"
            style={{
              backgroundImage: 'url(/talavera.png)',
              backgroundRepeat: 'repeat-x',
              backgroundSize: '240px auto'
            }}
          ></div>
          
          <div className="container mx-auto text-center relative z-10">
            <div className="flex justify-center mb-8 mt-12 animate-fade-in">
              <div className="relative group cursor-pointer">
                <img 
                  src="/Logo.png" 
                  alt="AWS User Group Puebla" 
                  className="h-32 md:h-48 w-auto transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-4 group-hover:drop-shadow-2xl animate-bounce-slow"
                />
                <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
            
            <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mb-8 animate-fade-in leading-relaxed">
              Únete a la comunidad oficial de desarrolladores y profesionales de AWS en Puebla. 
              <span className="block mt-2 font-medium text-accent">Aprende, comparte y crece junto a nosotros.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
              <Button variant="accent" size="lg" asChild className="shadow-talavera-lg hover:scale-105 transition-transform">
                <Link href="/login">Únete a la Comunidad</Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="hover:scale-105 transition-transform">
                <Link href="/events">Ver Eventos</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary">
                ¿Por qué unirte?
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-2 group">
                <CardHeader className="text-center">
                  <div className="mx-auto h-16 w-16 bg-gradient-to-br from-accent to-accent/70 rounded-2xl flex items-center justify-center mb-4 shadow-talavera group-hover:scale-110 transition-transform">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <CardTitle className="text-2xl">Comunidad</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">
                    Conecta con desarrolladores y arquitectos de soluciones AWS en Puebla. Networking real y colaboración continua.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-2 group">
                <CardHeader className="text-center">
                  <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center mb-4 shadow-talavera group-hover:scale-110 transition-transform">
                    <svg className="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <CardTitle className="text-2xl">Aprendizaje</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">
                    Accede a workshops, charlas técnicas y recursos educativos sobre AWS. Aprende de expertos certificados.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-2 group">
                <CardHeader className="text-center">
                  <div className="mx-auto h-16 w-16 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center mb-4 shadow-talavera group-hover:scale-110 transition-transform">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-2xl">Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">
                    Participa en meetups, hackathons y conferencias sobre tecnología AWS. Eventos mensuales presenciales.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-4 bg-gradient-to-r from-primary to-primary/90 text-secondary relative overflow-hidden">
          <TalaveraPattern variant="background" />
          <div className="container mx-auto relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="animate-fade-in">
                <div className="text-5xl font-bold text-accent mb-2">500+</div>
                <div className="text-sm opacity-90">Miembros</div>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="text-5xl font-bold text-accent mb-2">50+</div>
                <div className="text-sm opacity-90">Eventos</div>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="text-5xl font-bold text-accent mb-2">30+</div>
                <div className="text-sm opacity-90">Speakers</div>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="text-5xl font-bold text-accent mb-2">100%</div>
                <div className="text-sm opacity-90">Gratis</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5"></div>
          <TalaveraPattern variant="floating" className="top-10 right-10" animate />
          <TalaveraPattern variant="floating" className="bottom-10 left-10" animate />
          
          <div className="container mx-auto text-center relative z-10">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-text-primary">
                ¿Listo para formar parte de la comunidad?
              </h2>
              <p className="text-lg md:text-xl text-text-secondary mb-8 leading-relaxed">
                Únete a nosotros y acelera tu carrera en la nube de AWS. 
                <span className="block mt-2 font-medium">Eventos gratuitos, networking y aprendizaje continuo.</span>
              </p>
              <Button 
                variant="accent" 
                size="lg" 
                asChild 
                className="shadow-talavera-lg hover:scale-105 transition-transform text-lg px-12 py-6"
              >
                <Link href="/login">Únete Ahora</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Si está autenticado, mostrar el dashboard de eventos
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
    </main>
  );
}
