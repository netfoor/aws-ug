'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserData, getFullName } from '@/hooks/useUserData';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TalaveraPattern } from '@/components/ui/TalaveraPattern';
import { EditProfileForm, SpeakerApplicationForm, SpeakerApplicationStatus } from '@/components/profile';
import ProfessionalProfileForm from '@/components/profile/ProfessionalProfileForm';
import { calculateProfileCompleteness, getCompletenessMessage } from '@/lib/profile-utils';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();
  const { profile, loading: profileLoading, refetch } = useUserProfile();
  const { userData } = useUserData();
  const [isEditing, setIsEditing] = useState(false);
  const [showProfessionalForm, setShowProfessionalForm] = useState(false);

  // Handler para guardar perfil profesional
  async function handleSaveProfessionalProfile(data: any) {
    if (!user) return;

    try {
      await client.models.User.update({
        id: user.userId,
        speakerPhotoKey: data.speakerPhotoKey,
        speakerCvKey: data.speakerCvKey,
        linkedInUrl: data.linkedInUrl,
        expertiseArea: data.expertiseArea,
        updatedAt: new Date().toISOString(),
      });

      await refetch();
      setShowProfessionalForm(false);
    } catch (error) {
      console.error('Error updating professional profile:', error);
      throw error;
    }
  }

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent border-t-transparent mx-auto mb-4"></div>
          <p className="text-text-secondary">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center" variant="elevated">
          <CardContent className="p-8">
            <div className="mx-auto h-16 w-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Acceso Restringido</h1>
            <p className="text-text-secondary mb-6">Debes iniciar sesión para ver tu perfil.</p>
            <Button variant="accent" asChild>
              <Link href="/login?returnUrl=/profile">Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
        <div className="relative overflow-hidden">
          <TalaveraPattern variant="background" />
        </div>
        
        <div className="container mx-auto px-4 py-8 relative z-10">
          <EditProfileForm
            onSuccess={async () => {
              // Recargar el perfil en ProfilePage antes de cerrar el formulario
              await refetch();
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  // ✅ Simplificado: profile y userData son el mismo objeto (User table)
  // useUserProfile ya carga desde User table
  const displayName = getFullName(profile || userData);
  const displayEmail = profile?.email || userData?.email || user.signInDetails?.loginId || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
      <div className="relative overflow-hidden">
        <TalaveraPattern variant="background" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-text-primary mb-2">Mi Perfil</h1>
            <p className="text-text-secondary">Gestiona tu información personal y preferencias</p>
          </div>

          {/* Profile Card */}
          <Card className="mb-8" variant="elevated">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-white">
                  {displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <CardTitle className="text-2xl">{displayName}</CardTitle>
              <p className="text-text-secondary">{typeof displayEmail === 'string' ? displayEmail : ''}</p>
              <div className="flex justify-center gap-2 mt-4">
                <Badge 
                  variant={profile?.role === 'ADMIN' ? 'warning' : profile?.role === 'SPEAKER' ? 'accent' : 'default'}
                  title="Este role se asigna automáticamente desde los grupos de Cognito"
                >
                  {profile?.role || 'MEMBER'}
                </Badge>
                {isAdmin && (
                  <Badge variant="warning" title="Tienes permisos de administrador desde Cognito">
                    🔑 Admin Access
                  </Badge>
                )}
                {profile?.newsletterOptIn && (
                  <Badge variant="primary">Newsletter Suscrito</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Información de Role */}
              <div className="bg-secondary/30 border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 text-accent mt-0.5">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">Sobre tu role</h4>
                    <p className="text-sm text-text-secondary">
                      Tu role <strong>{profile?.role || 'MEMBER'}</strong> se asigna automáticamente. 
                      {isAdmin ? ' Como administrador, tienes acceso completo a todas las funciones.' : ' Para cambiar tu role, contacta a un administrador.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información Personal */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Información Personal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Teléfono</label>
                    <p className="text-text-primary">{profile?.phoneNumber || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Empresa</label>
                    <p className="text-text-primary">{profile?.company || 'No especificado'}</p>
                  </div>
                </div>
                {profile?.bio && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Biografía</label>
                    <p className="text-text-primary">{profile.bio}</p>
                  </div>
                )}
              </div>

              {/* Intereses */}
              {profile?.interests && profile.interests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Intereses en AWS</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <Badge key={index} variant="primary">{interest}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Redes Sociales */}
              {profile?.socialLinks && Object.keys(profile.socialLinks).some(key => profile.socialLinks?.[key as keyof typeof profile.socialLinks]) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Redes Sociales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(profile.socialLinks).map(([platform, url]) => 
                      url ? (
                        <div key={platform}>
                          <label className="block text-sm font-medium text-text-secondary mb-1 capitalize">{platform}</label>
                          <a 
                            href={url as string} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-accent hover:underline break-all"
                          >
                            {url as string}
                          </a>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Botón Editar */}
              <div className="pt-4 border-t border-border">
                <Button 
                  variant="accent" 
                  onClick={() => setIsEditing(true)}
                  className="w-full md:w-auto"
                >
                  Editar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Speaker Application Section */}
          {profile?.role !== 'SPEAKER' && profile?.role !== 'ADMIN' && (
            <div id="speaker-section" className="mb-8 scroll-mt-20">
              <h2 className="text-2xl font-bold text-text-primary mb-4">🎤 Conviértete en Speaker</h2>
              <SpeakerApplicationStatus userId={user.userId} />
              <div className="mt-4">
                <SpeakerApplicationForm 
                  userId={user.userId}
                  userEmail={String(displayEmail)}
                  onSuccess={async () => {
                    await refetch();
                  }}
                />
              </div>
            </div>
          )}

          {/* Professional Profile Section (For Speakers) */}
          {(profile?.role === 'SPEAKER' || profile?.role === 'ADMIN') && (
            <div className="mb-8">
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      💼 Perfil Profesional de Speaker
                    </CardTitle>
                    {(() => {
                      const completeness = calculateProfileCompleteness(profile);
                      return (
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs text-text-secondary">
                              {getCompletenessMessage(completeness)}
                            </p>
                          </div>
                          <div className={`
                            px-3 py-1 rounded-full text-sm font-semibold
                            ${completeness.percentage === 100 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                              : completeness.percentage >= 75
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : completeness.percentage >= 50
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }
                          `}>
                            {completeness.percentage}%
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardHeader>
                <CardContent>
                  {!showProfessionalForm ? (
                    <div className="space-y-4">
                      {/* Status actual */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-semibold text-text-secondary mb-1">Foto Profesional</p>
                          <p className="text-text-primary">
                            {profile?.speakerPhotoKey ? '✅ Cargada' : '⚠️ No cargada'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-secondary mb-1">CV</p>
                          <p className="text-text-primary">
                            {profile?.speakerCvKey ? '✅ Cargado' : '⚠️ No cargado'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-secondary mb-1">LinkedIn</p>
                          <p className="text-text-primary">
                            {profile?.linkedInUrl ? (
                              <a 
                                href={profile.linkedInUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                              >
                                Ver perfil
                              </a>
                            ) : (
                              '⚠️ No agregado'
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-secondary mb-1">Área de Especialización</p>
                          <p className="text-text-primary">
                            {profile?.expertiseArea || '⚠️ No especificada'}
                          </p>
                        </div>
                      </div>

                      {/* Botón para editar */}
                      <Button
                        variant="outline"
                        onClick={() => setShowProfessionalForm(true)}
                        className="w-full md:w-auto"
                      >
                        {profile?.speakerCvKey || profile?.linkedInUrl 
                          ? 'Actualizar Perfil Profesional' 
                          : 'Completar Perfil Profesional'}
                      </Button>

                      {!profile?.speakerCvKey && !profile?.linkedInUrl && (
                        <p className="text-sm text-amber-600">
                          💡 Completa tu perfil profesional para mejorar tu visibilidad como speaker
                        </p>
                      )}
                    </div>
                  ) : (
                    <ProfessionalProfileForm
                      userId={user.userId}
                      initialData={{
                        speakerPhotoKey: profile?.speakerPhotoKey || undefined,
                        speakerCvKey: profile?.speakerCvKey || undefined,
                        linkedInUrl: profile?.linkedInUrl || undefined,
                        expertiseArea: profile?.expertiseArea || undefined,
                      }}
                      onSave={handleSaveProfessionalProfile}
                      onSkip={() => setShowProfessionalForm(false)}
                      showSkipButton={true}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="elevated">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Próximos Eventos</h3>
                <p className="text-sm text-text-secondary mb-4">Ve los eventos a los que te has registrado</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard">Ver Eventos</Link>
                </Button>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Recursos</h3>
                <p className="text-sm text-text-secondary mb-4">Accede a materiales y grabaciones</p>
                <Button variant="outline" size="sm" disabled>
                  Próximamente
                </Button>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card variant="elevated">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold mb-2">Administración</h3>
                  <p className="text-sm text-text-secondary mb-4">Panel de administrador</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin">Ir al Panel</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
