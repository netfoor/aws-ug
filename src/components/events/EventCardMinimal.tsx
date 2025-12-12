'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventCardMinimalProps {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string;
  speakerName: string;
  speakerAvatar?: string;
  startDate: string; // ISO string
  location: string;
  isVirtual: boolean;
  goingCount: number;
  maxAttendees?: number;
  isUnlimited: boolean;
}

export default function EventCardMinimal({
  id,
  title,
  slug,
  coverImageUrl,
  speakerName,
  speakerAvatar,
  startDate,
  location,
  isVirtual,
  goingCount,
  maxAttendees,
  isUnlimited,
}: EventCardMinimalProps) {
  // Format date
  const eventDate = new Date(startDate);
  const formattedDate = format(eventDate, "d MMM • h:mm a", { locale: es });

  // Calculate capacity
  const spotsLeft = maxAttendees && !isUnlimited ? maxAttendees - goingCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const isAlmostFull = spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 10;

  return (
    <Link 
      href={`/events/${slug}`}
      className="block bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
    >
      <div className="flex gap-3 p-3">
        {/* Left Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Speaker Info */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {speakerAvatar ? (
                <img 
                  src={speakerAvatar} 
                  alt={speakerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-semibold text-accent">
                  {speakerName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-[11px] text-text-secondary font-medium truncate">
              {speakerName}
            </span>
          </div>

          {/* Event Title */}
          <h3 className="text-sm font-bold text-text-primary leading-snug line-clamp-2">
            {title}
          </h3>

          {/* Date & Time */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="capitalize">{formattedDate}</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{isVirtual ? '🌐 Virtual' : location}</span>
          </div>

          {/* Attendees count - always show */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {goingCount} {goingCount === 1 ? 'asistente' : 'asistentes'}
              {spotsLeft !== null && spotsLeft > 0 && (
                <span className="text-accent font-medium ml-1">
                  • {spotsLeft}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Right Image with divider line */}
        <div className="relative flex-shrink-0">
          {/* Image aligned with title */}
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-accent/20 to-accent/5 mt-6">
            {coverImageUrl ? (
              <img 
                src={coverImageUrl} 
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            )}
            
            {/* Status badge */}
            {isFull && (
              <div className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                Lleno
              </div>
            )}
            {isAlmostFull && !isFull && (
              <div className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                Últimos
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
