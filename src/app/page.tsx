'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, CalendarDays, Clock } from 'lucide-react';
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
  const [speakers, setSpeakers] = useState<Record<string, Schema['User']['type']>>({});

  // Scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1 }
    );

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

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
      
      // Load actual registration counts
      await loadRegistrationCounts(sorted);
      
      // Load speaker data for all events
      loadSpeakers(sorted);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadSpeakers = async (eventsList: EventType[]) => {
    const speakersData: Record<string, Schema['User']['type']> = {};
    
    await Promise.all(
      eventsList.map(async (event) => {
        if (event.speakerId && event.id) {
          try {
            const { data: speakerData } = await client.models.User.get({ id: event.speakerId });
            if (speakerData) {
              speakersData[event.id] = speakerData;
            }
          } catch (err) {
            console.warn(`Error loading speaker for event ${event.id}:`, err);
          }
        }
      })
    );
    
    setSpeakers(speakersData);
  };

  const loadRegistrationCounts = async (eventsList: EventType[]) => {
    try {
      // Para cada evento, consultar cuántos registros tiene
      const updatedEvents = await Promise.all(
        eventsList.map(async (event) => {
          if (!event.id) return event;
          
          try {
            const { data: registrations } = await client.models.EventRegistration.registrationsByEvent({
              eventId: event.id,
            });
            
            // Contar solo los que tienen status GOING
            const actualCount = registrations?.filter(r => r.status === 'GOING').length || 0;
            
            // Si el count en DB no coincide con el real, usar el real
            if (event.goingCount !== actualCount) {
              // Actualizar también en la base de datos para sincronizar
              try {
                await client.models.Event.update({
                  id: event.id,
                  goingCount: actualCount,
                });
              } catch (updateErr) {
                console.error(`Error updating goingCount in DB:`, updateErr);
              }
              
              // Actualizar el evento en memoria con el count correcto
              return { ...event, goingCount: actualCount };
            }
            
            return event;
          } catch (err) {
            console.error(`Error loading registrations for event ${event.id}:`, err);
            return event;
          }
        })
      );
      
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Error loading registration counts:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [filter, isAuthenticated, fetchEvents]);

  // Recargar eventos cuando la página vuelve a tener foco (después de registro)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const handleFocus = () => {
      if (!loading) {
        fetchEvents();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, loading, fetchEvents]);

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
                <Image 
                  src="/Logo.png" 
                  alt="AWS User Group Puebla" 
                  width={192}
                  height={192}
                  className="h-32 md:h-48 w-auto transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-4 group-hover:drop-shadow-2xl animate-bounce-slow"
                  priority
                />
                <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
            
            <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mb-8 animate-fade-in leading-relaxed">
              Únete a la comunidad oficial de desarrolladores y profesionales de AWS en Puebla. 
              <span className="block mt-2 font-medium text-accent">Aprende, comparte y crece junto a nosotros.</span>
            </p>
            

            {/* Redes sociales fijas al fondo */}
            <div className="py-2 px-2 mb-6">              

              <div className="flex items-center justify-center gap-4">
                <a href="https://www.meetup.com/awspuebla/" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent transition-colors" aria-label="Meetup">
              <svg className="w-5 h-5" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2"><path d="M103.17 66.372c72.78-29.995 206.275-64.453 300.464-37.674 48.44 13.771 92.41 65.892 100.84 121.418 6.982 46.012-10.863 98.615-35.527 125.234-1.81 1.952-2.772 4.541-2.59 7.197.063.938.28 1.892.618 2.766 34.073 87.607-19.385 129.919-80.296 141.804-62.374 12.171-123.282 33.055-181.862 57.455h-.005l-.003.003c-60.04 25.055-146.057-.792-175.106-65.15-16.422-36.388-4.82-89.32 8.426-126.796 1.611-4.556.688-9.614-2.251-13.45-10.904-14.233-19.474-31.152-24.808-50.232-20.952-74.966 25.624-135.179 92.1-162.575zm214.193 99.404c-17.246-19.067-47.744-22.127-70.836-.76-4.478 4.144-12.685 3.187-16.98-1.148-13.798-13.926-39.054-16.85-60.273-8.336-17.538 7.038-31.625 23.16-40.112 47.901 0 0-15.38 59.215-28.54 95.25-20.83 61.703 70.195 79.477 88.112 21.645l25.832-90.606c4.078-13.142 10.25-24.441 22.646-21.293 12.397 3.15 13.06 15.885 8.18 29.582l-12.089 49.994c-11.055 39.928 45.097 50.708 56.982 14.112l19.386-72.395c3.86-13.917 10.799-22.08 20.842-19.982 10.046 2.098 13.098 10.709 9.128 24.604l-10.684 42.18c-7.022 24.257-.685 44.42 23.76 48.34 26.651 4.273 43.395-6.925 49.102-11.66 1.499-1.236 2.37-3.015 2.692-4.934.64-3.789-2.293-7.192-6.123-7.3-10.095-.274-16.284-1.82-18.52-8.327-1.71-4.974-2.311-10.351.773-21.175 2.678-9.4 9.483-33.842 14.47-51.792 5.567-20.04 13.31-42.922-5.213-58.764-15.55-13.301-39.755-9.482-58.684 6.131-4.033 3.33-10.34 2.615-13.85-1.267zM348.197 499.938c75.614-1.955 96.11-48.22 78.498-51.673-48.036-9.42-249.115 56.089-78.498 51.673zM88.1 12.683C36.057 16.735 19.974 68.258 32.53 68.258c33.333 0 169.341-64.428 55.572-55.575z" fill="currentColor" fillRule="nonzero"/></svg>
              
                            </a>
                            <a href="https://chat.whatsapp.com/FR64xg90PBEFuQRjROGPxL?fbclid=PAZXh0bgNhZW0CMTEAAaYYOYZCc-uFdoGYdOblm6EPreCHWTKuz9M-J_1L3Kmx4Ie1HOvRCzbDdBc_aem_Pubb18Utgq-GFt_XT6ErIw" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent transition-colors" aria-label="Whatsapp">
                              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M20.52 3.48A11.86 11.86 0 0012.01 0C5.38 0 .04 5.34.04
                  11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.21-1.63a11.92 11.92 0
                  005.8 1.48h.01c6.63 0 11.98-5.34 11.98-11.97 0-3.2-1.25-6.2-3.48-8.4zm-8.51
                  18.3a9.9 9.9 0 01-5.04-1.38l-.36-.21-3.69.97.98-3.6-.23-.37a9.9
                  9.9 0 01-1.52-5.22c0-5.45 4.43-9.88 9.88-9.88a9.82 9.82 0
                  016.99 2.9 9.83 9.83 0 012.89 6.98c0 5.45-4.43 9.88-9.88 9.88zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.48.71.3 1.26.48 1.69.61.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35z"/>
              </svg>
                </a>
                
                <a href="https://www.instagram.com/awspuebla" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent transition-colors" aria-label="Instagram">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="https://www.linkedin.com/company/awspuebla/" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent transition-colors" aria-label="LinkedIn">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://www.youtube.com/@awspuebla" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent transition-colors" aria-label="YouTube">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="https://github.com/awspuebla" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent transition-colors" aria-label="GitHub">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="mailto:awspuebla@gmail.com" className="text-text-secondary hover:text-accent transition-colors" aria-label="Email">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </a>
              </div>
            </div>


            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
              <Button variant="accent" size="lg" asChild className="shadow-talavera-lg hover:scale-105 transition-transform">
                <Link href="/login">Únete a la Comunidad</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* What is AWS User Group Section */}
        <section className="py-20 px-4 relative bg-gradient-to-br from-surface to-background">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          
          <div className="container mx-auto text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary scroll-reveal">
              ¿Qué es un AWS User Group?
            </h2>


            <div className="mt-8 scroll-reveal">
              <img 
                src="/landing/amazon-arroy.svg" 
                alt="Amazon Web Services" 
                className="w-16 h-16 mx-auto opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>
            
            <br />
            <p className="text-lg md:text-xl text-text-secondary max-w-4xl mx-auto leading-relaxed scroll-reveal">
              Los AWS User Groups son comunidades locales de desarrolladores, arquitectos y entusiastas de AWS que se reúnen para aprender, compartir conocimientos y hacer networking. Organizados por voluntarios, ofrecen eventos gratuitos como meetups, workshops y conferencias para promover el crecimiento profesional en la nube de AWS.
            </p>
            
            <div className="mt-12 scroll-reveal">
              <Image
                src="/landing/ug-leaders.jpg"
                alt="Líderes de las comunidades AWS User Groups en México"
                width={800}
                height={400}
                className="w-full max-w-4xl mx-auto rounded-2xl shadow-talavera-lg"
              />
              <p className="text-center text-text-secondary mt-4 text-sm">
                Líderes de las comunidades AWS User Groups en México
              </p>
            </div>
            
          </div>
        </section>

        {/* User Groups in Mexico Section */}
        <section className="py-20 px-4 relative">
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary scroll-reveal">
                La Red de AWS User Groups en México
              </h2>
              

<div className="mt-8 scroll-reveal">
              <img 
                src="/landing/amazon-arroy.svg" 
                alt="Amazon Web Services" 
                className="w-16 h-16 mx-auto opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>

            <br />

              <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto scroll-reveal">
                México cuenta con una vibrante red de comunidades AWS que conectan a profesionales de la nube en todo el país.
              </p>

              
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">

              {/* Other UGs */}
              {[
                { name: 'Ajolotes', image: 'ajolotes.png' },
                { name: 'Embajadoras', image: 'embajadoras.png' },
                { name: 'Ensenada', image: 'ensenada.png' },
                { name: 'Hermosillo', image: 'hermosillo.png' },
                { name: 'Jalisco', image: 'jalisco.png' },
                { name: 'León', image: 'leon.png' },
                { name: 'Mérida', image: 'merida.png' },
                { name: 'Mexicali', image: 'mexicali.png' },
                { name: 'Monterrey', image: 'monterrey.png' },
                { name: 'Orizaba', image: 'orizaba.png' },
                { name: 'Querétaro', image: 'queretaro.png' },
                { name: 'Saltillo', image: 'saltillo.png' },
                { name: 'Tijuana', image: 'tijuana.png' },
                { name: 'Tlaxcala', image: 'tlaxcala.png' },
                { name: 'Villahermosa', image: 'villahermosa.png' }
              ].map((ug, index) => (
                <div key={ug.name} className="group relative scroll-reveal" style={{ animationDelay: `${(index + 1) * 0.1}s` }}>
                  <div className=" p-4 rounded-2xl shadow-lg hover:shadow-talavera-lg hover:scale-105 transition-all duration-300">
                    <div className="text-center">
                      <Image
                        src={`/landing/ug-mex/${ug.image}`}
                        alt={`AWS User Group ${ug.name}`}
                        width={80}
                        height={80}
                        className="w-20 h-20 mx-auto mb-3 rounded-lg object-contain"
                      />
                      <h3 className="font-bold text-text-primary text-sm">{ug.name}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>

              <div className="mt-8 text-center scroll-reveal">
                <br />
                <br />
                <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto scroll-reveal">
                ¡Y Puebla es parte de esta gran familia!
                <br />
                <br />
              </p>
              </div>

                            {/* Puebla - Highlighted */}
              <div className="group relative scroll-reveal">
                <div className=" from-accent to-primary rounded-2xl shadow-talavera-lg hover:scale-105 transition-all duration-300 p-4">
                  <div className="text-center">
                    
                    <Image 
                      src="/Logo.png" 
                      alt="AWS User Group Puebla" 
                      width={192}
                      height={192}
                      className="w-32 h-32 mx-auto mb-3 transition-all duration-500 ease-out group-hover:scale-110 group-hover:-translate-y-4 group-hover:drop-shadow-2xl animate-bounce-slow"
                      priority
                    />
                    <h3 className="font-bold text-text-primary text-sm">Puebla</h3>
                    <p className="text-xs text-accent font-medium">¡Nuestra casa!</p>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center text-secondary text-xs font-bold">
                  ★
                </div>
              </div>



          </div>



        </section>

        {/* Past Events Section */}
        <section className="py-20 px-4 relative bg-gradient-to-br from-background to-surface">
          <div className="absolute inset-0 bg-[url('/landing/pueblabg.png')] bg-cover bg-center opacity-10"></div>
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary scroll-reveal">
                Revive Nuestros Eventos Pasados
              </h2>
              

              <div className="mt-8 scroll-reveal">
              <img 
                src="/landing/amazon-arroy.svg" 
                alt="Amazon Web Services" 
                className="w-16 h-16 mx-auto opacity-80 hover:opacity-100 transition-opacity"
              />
              </div>
              <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto scroll-reveal">
                Desde charlas técnicas hasta talleres prácticos, nuestros eventos han reunido a la comunidad AWS en Puebla con temas inspiradores y aprendizaje continuo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { image: 'anniversary.png', title: 'Aniversario AWS UG Puebla', description: 'Celebrando un año de comunidad y crecimiento' },
                { image: 'meetup.png', title: 'Meetup Mensual', description: 'Networking y charlas técnicas en el corazón de Puebla' },
                { image: 'summit-mexico.png', title: 'AWS Summit México', description: 'Participación en el evento nacional más importante' },
                { image: 'talks.png', title: 'Charlas Especiales', description: 'Invitados expertos compartiendo conocimientos avanzados' }
              ].map((event, index) => (
                <div key={event.title} className="group relative scroll-reveal" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="relative overflow-hidden rounded-2xl shadow-talavera-lg hover:shadow-talavera-xl transition-all duration-300">
                    <Image
                      src={`/landing/events/${event.image}`}
                      alt={event.title}
                      width={400}
                      height={300}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {/* Overlay solo en desktop */}
                    <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-secondary">
                        <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                        <p className="text-sm opacity-90">{event.description}</p>
                      </div>
                    </div>
                  </div>
                  {/* Descripción abajo solo en móvil */}
                  <div className="md:hidden mt-4 text-center">
                    <h3 className="font-bold text-lg mb-2 text-text-primary">{event.title}</h3>
                    <p className="text-sm text-text-secondary">{event.description}</p>
                  </div>
                </div>
              ))}
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
              <div className="mt-8 scroll-reveal">
              <img 
                src="/landing/amazon-arroy.svg" 
                alt="Amazon Web Services" 
                className="w-16 h-16 mx-auto opacity-80 hover:opacity-100 transition-opacity"
              />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="hover:shadow-talavera-lg transition-all duration-300 hover:-translate-y-2 group">
                <CardHeader className="text-center">
                  <div className="mx-auto h-16 w-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <div className="mx-auto h-16 w-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <div className="mx-auto h-16 w-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-2xl">Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-base">
                    Participa en meetups, hackathons y conferencias sobre tecnología AWS. Charlas técnicas mensuales el último jueves de cada mes, presenciales en Puebla.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section 
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
        */}

        {/* Separator with Puebla Background */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/landing/pueblabg.png')] bg-cover bg-center opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20"></div>
          <div className="container mx-auto relative z-10 text-center">
            
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 relative">
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary scroll-reveal">
                Preguntas Frecuentes
              </h2>
              <div className="mt-8 scroll-reveal">
              <img 
                src="/landing/amazon-arroy.svg" 
                alt="Amazon Web Services" 
                className="w-16 h-16 mx-auto opacity-80 hover:opacity-100 transition-opacity"
              />
              </div>
              <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto scroll-reveal">
                Resolvemos tus dudas sobre la comunidad AWS User Group Puebla
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {[
                {
                  question: '¿Los eventos son gratuitos?',
                  answer: 'Sí, todos nuestros eventos son completamente gratuitos. Creemos que el conocimiento debe ser accesible para todos.'
                },
                {
                  question: '¿Necesito experiencia previa en AWS?',
                  answer: 'No es necesario. Nuestros eventos van desde introducción a temas avanzados, así que hay algo para todos los niveles.'
                },
                {
                  question: '¿Cómo me uno a la comunidad?',
                  answer: 'Solo regístrate en nuestra plataforma y únete a nuestros eventos. También puedes seguirnos en redes sociales para estar al día.'
                },
                {
                  question: '¿Dónde se realizan los eventos?',
                  answer: 'Principalmente en Puebla, en espacios como universidades, coworkings y empresas locales. Nuestras charlas técnicas regulares son el último jueves de cada mes. Algunos eventos son híbridos o virtuales.'
                },
                {
                  question: '¿Qué temas se cubren en los eventos?',
                  answer: 'Desde fundamentos de AWS hasta temas avanzados como serverless, machine learning, DevOps, y mejores prácticas en la nube.'
                },
                {
                  question: '¿Puedo proponer un tema o ser speaker?',
                  answer: '¡Absolutamente! Si tienes experiencia en AWS y quieres compartir conocimientos, contáctanos. Valoramos las contribuciones de la comunidad.'
                }
              ].map((faq, index) => (
                <div key={index} className="bg-surface border border-border-light rounded-2xl p-6 shadow-lg hover:shadow-talavera-lg transition-all duration-300 scroll-reveal" style={{ animationDelay: `${index * 0.1}s` }}>
                  <h3 className="text-xl font-bold text-text-primary mb-3">{faq.question}</h3>
                  <p className="text-text-secondary leading-relaxed">{faq.answer}</p>
                </div>
              ))}
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
                <CalendarDays className="w-4 h-4" />
                Próximos
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
                <Clock className="w-4 h-4" />
                Pasados
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
                speaker={event.id ? speakers[event.id] : undefined}
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
