'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/context/auth-context';
import { useUserData, getUserInitials } from '@/hooks/useUserData';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';

interface NavigationProps {
  className?: string;
}

export function Navigation({ className }: NavigationProps) {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { userData } = useUserData();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // ✅ Obtener rol desde User table
  const isSpeaker = userData?.role === 'SPEAKER' || userData?.role === 'ADMIN';

  const navItems = [
    { href: '/', label: 'Inicio' },
    { href: '/events', label: 'Eventos' },
    { href: '/comunidad', label: 'Comunidad' },
    { href: '/speakers', label: 'Speakers' },
    { href: '/blog', label: 'Blog' },
  ];

  return (
    <nav className={cn(
      'sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/60 theme-transition',
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative h-10 w-10 flex-shrink-0">
              <Image
                src="/Logo.png"
                alt="AWS User Group Puebla"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-text-primary">
                AWS UG Puebla
              </h1>
              <p className="text-xs text-text-secondary">
                User Group Oficial
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </Button>

            {/* 🔔 Notificaciones */}
            <NotificationBell />

            {isAuthenticated ? (
              <>
                {/* Avatar clickeable - lleva directo a perfil */}
                <Link
                  href="/profile"
                  className="h-9 w-9 bg-gradient-to-br from-accent to-accent/70 rounded-full items-center justify-center hover:scale-110 transition-transform shadow-sm hidden sm:flex"
                >
                  <span className="text-white font-semibold text-sm">
                    {getUserInitials(userData)}
                  </span>
                </Link>
              </>
            ) : (
              <Button variant="accent" size="sm" className="hidden sm:inline-flex" asChild>
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-9 w-9 p-0"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-border animate-slide-down">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-secondary/50 rounded-md transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="block px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-secondary/50 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-secondary/50 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Perfil
                  </Link>
                  {isSpeaker && (
                    <>
                      <Link
                        href="/speaker/propose-talk"
                        className="block px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-secondary/50 rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Proponer Charla
                      </Link>
                      <Link
                        href="/speaker/my-proposals"
                        className="block px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-secondary/50 rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Mis Propuestas
                      </Link>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <Link
                        href="/admin/speakers"
                        className="block px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-secondary/50 rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Panel Admin
                      </Link>
                      <Link
                        href="/admin/talk-proposals"
                        className="block px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-secondary/50 rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Gestionar Propuestas
                      </Link>
                      <Link
                        href="/admin/events"
                        className="block px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-secondary/50 rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Gestión de Eventos
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-secondary/50 rounded-md transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <div className="px-3 py-2">
                  <Button variant="accent" size="sm" className="w-full" asChild>
                    <Link href="/login">Iniciar Sesión</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
