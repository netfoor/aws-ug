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
                {/* Avatar clickeable - lleva directo a perfil (visible en mobile y desktop) */}
                <Link
                  href="/profile"
                  className="h-6.5 w-6.5 bg-gradient-to-br from-accent to-accent/70 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-surface border-t border-border md:hidden z-50 h-[calc(100vh-4rem)] flex flex-col">
            {/* Links scrollables */}
            <div className="flex-1 overflow-y-auto px-2 pt-2 pb-3 space-y-1">
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
                    href="/profile"
                    className="block px-3 py-2 text-base font-medium text-text-secondary hover:text-text-primary hover:bg-secondary/50 rounded-md transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {/* Perfil removido - ahora se accede con el avatar */}
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

            {/* Redes sociales fijas al fondo */}
            <div className="border-t border-border py-4 px-2 mb-6">
              <p className="text-xs text-text-secondary text-center mb-3">Síguenos</p>
              <div className="flex items-center justify-center gap-4">
                <a href="https://instagram.com/awsusergrouppuebla" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent transition-colors" aria-label="Instagram">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="https://linkedin.com/company/aws-user-group-puebla" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent transition-colors" aria-label="LinkedIn">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://youtube.com/@awsusergroupuebla" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent transition-colors" aria-label="YouTube">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="https://github.com/aws-ug-puebla" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-accent transition-colors" aria-label="GitHub">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="mailto:contact@awsugpuebla.com" className="text-text-secondary hover:text-accent transition-colors" aria-label="Email">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
