'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../../amplify/data/resource';
import UnifiedSpeakerProposalForm from '@/components/speaker/UnifiedSpeakerProposalForm';
import { useAuth } from '@/context/auth-context';
import { useUserProfile } from '@/hooks/useUserProfile';


const client = generateClient<Schema>();

interface UnifiedFormData {
  givenName: string;
  familyName: string;
  email: string;
  phoneNumber: string;
  company: string;
  jobTitle: string;
  expertiseArea: string;
  photoFile: File | null;
  photoKey: string | null;
  cvFile: File | null;
  cvKey: string | null;
  linkedInUrl: string;
  motivation: string;
  experience: string;
  topics: string[];
  talkTitle: string;
  talkDescription: string;
  duration: number;
  targetAudience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  proposedDate: Date | null;
}

export default function UnifiedSpeakerApplicationPage() {
  const router = useRouter();
  const { user, userAttributes, isLoading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string>('');



  // Check if user has access - Enhanced with role management
  useEffect(() => {
    async function checkAccess() {
      if (authLoading || profileLoading) return;

      if (!user) {
        router.push('/auth/signin?redirect=/speaker/apply');
        return;
      }

      const userEmail = (userAttributes?.email as string) || '';
      if (!userEmail) return;

      try {
        // Check if user already applied (using userId instead of email since contact email may vary)
        const { data: applications } = await client.models.SpeakerApplication.list({
          filter: { userId: { eq: user.userId } }
        });

        if (applications && applications.length > 0) {
          const pendingOrApproved = applications.find(
            app => app.status === 'PENDING' || app.status === 'APPROVED'
          );

          if (pendingOrApproved) {
            setAlreadyApplied(true);
            setHasAccess(false);
            setIsCheckingAccess(false);
            return;
          }
        }

        // Enhanced role management - preserve admin role
        const userRole = profile?.role;

        if (userRole === 'ADMIN') {
          // Admin can access but we need to be careful not to trigger speaker notifications
          console.log('🔐 Admin accessing speaker application - notifications will be suppressed');
          setHasAccess(true);
        } else if (userRole === 'SPEAKER') {
          // Already a speaker, redirect to propose-talk
          setAccessDeniedReason('Ya eres speaker. Puedes proponer charlas directamente.');
          router.push('/speaker/propose-talk');
          return;
        } else {
          // Regular member - has access
          setHasAccess(true);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
        setAccessDeniedReason('Error al verificar permisos. Intenta de nuevo.');
      } finally {
        setIsCheckingAccess(false);
      }
    }

    // Only run when we have stable user data and not loading
    if (!authLoading && !profileLoading && user?.userId && userAttributes?.email) {
      checkAccess();
    }
  }, [user, userAttributes?.email, profile?.role, authLoading, profileLoading, router]);

  async function handleSubmit(formData: UnifiedFormData) {
    if (!user) return;

    const userEmail = (userAttributes?.email as string) || '';
    if (!userEmail) {
      throw new Error('No se pudo obtener el email del usuario');
    }

    try {
      // Enhanced role management - check if user is admin
      const isAdmin = profile?.role === 'ADMIN';

      // Create SpeakerApplication with attached proposal
      const applicationData = {
        userId: user.userId,
        email: formData.email, // Contact email for speaker application (may differ from user's primary email)
        motivation: formData.motivation,
        experience: formData.experience,
        topics: formData.topics,
        status: 'PENDING' as const,
        submittedAt: new Date().toISOString(),
        hasAttachedProposal: true, // Important flag!
        // Add admin flag to prevent inappropriate notifications
        isAdminApplication: isAdmin,
        // Attached proposal data (JSON as string)
        attachedProposal: JSON.stringify({
          talkTitle: formData.talkTitle,
          talkDescription: formData.talkDescription,
          duration: formData.duration,
          targetAudience: formData.targetAudience,
          proposedDate: formData.proposedDate?.toISOString(),
          // Calcular start/end times basados en la duración (ejemplo: 18:30 - 19:15 para 45 min)
          startTime: '18:30', // Hora habitual de eventos
          endTime: (() => {
            const duration = formData.duration || 45;
            const startMinutes = 18 * 60 + 30; // 18:30 en minutos
            const endMinutes = startMinutes + duration;
            const hours = Math.floor(endMinutes / 60);
            const minutes = endMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          })(),
        }),
        // Professional profile data (JSON as string)
        professionalProfile: JSON.stringify({
          photoKey: formData.photoKey,
          cvKey: formData.cvKey,
          linkedInUrl: formData.linkedInUrl,
          expertiseArea: formData.expertiseArea,
          company: formData.company,
          jobTitle: formData.jobTitle,
          phoneNumber: formData.phoneNumber,
          givenName: formData.givenName,
          familyName: formData.familyName,
        })
      };

      const { data: application, errors } = await client.models.SpeakerApplication.create(applicationData);

      if (errors) {
        console.error('Error creating application:', errors);
        throw new Error('Error al crear la solicitud');
      }

      console.log('✅ Application created with attached proposal:', application);

      // 🔔 Notify admins about new speaker application with proposal
      if (application?.id) {
        try {
          const notifyResponse = await fetch('/api/speaker/notify-admins', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              proposalId: application.id,
              speakerName: `${formData.givenName} ${formData.familyName}`,
              title: formData.talkTitle,
            }),
          });

          if (!notifyResponse.ok) {
            console.warn('⚠️ No se pudo notificar a los admins:', await notifyResponse.text());
          } else {
            console.log('✅ Admins notificados sobre nueva aplicación');
          }
        } catch (notifyError) {
          console.warn('⚠️ Error al notificar admins (no crítico):', notifyError);
          // No fallar el flujo principal si falla la notificación
        }
      }

      // Update user profile with professional data
      if (profile?.id) {
        const updateData: {
          id: string;
          company?: string;
          speakerPhotoKey?: string | null;
          speakerCvKey?: string | null;
          linkedInUrl?: string;
          expertiseArea?: string;
        } = {
          id: profile.id,
          company: formData.company,
          speakerPhotoKey: formData.photoKey,
          speakerCvKey: formData.cvKey,
          linkedInUrl: formData.linkedInUrl,
          expertiseArea: formData.expertiseArea,
        };

        // For admins, preserve their role and don't auto-promote to speaker
        if (isAdmin) {
          console.log('🔐 Preserving admin role during speaker application');
          // Don't change role for admins
        }

        await client.models.User.update(updateData);
      }



      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting unified proposal:', error);
      throw error;
    }
  }



  // Loading state
  if (authLoading || profileLoading || isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-text-secondary">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Already applied
  if (alreadyApplied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-lg p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Ya has aplicado
          </h1>
          <p className="text-text-secondary mb-6">
            Tu solicitud ya está en proceso. Te notificaremos cuando sea revisada.
          </p>
          <button
            onClick={() => router.push('/profile')}
            className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
          >
            Ver mi perfil
          </button>
        </div>
      </div>
    );
  }

  // No access
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-lg p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Acceso denegado
          </h1>
          <p className="text-text-secondary mb-6">
            {accessDeniedReason || 'No tienes permiso para acceder a esta página.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-lg p-8 shadow-lg text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            ¡Solicitud Enviada con Éxito! 🎉
          </h1>
          <p className="text-text-secondary mb-6">
            Tu solicitud como speaker <strong>con propuesta de charla incluida</strong> ha sido enviada correctamente.
            Recibirás un correo de confirmación pronto.
          </p>
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-text-primary">
              <strong>¿Qué sigue?</strong>
            </p>
            <ul className="text-sm text-text-secondary mt-2 space-y-1 list-disc list-inside">
              <li>Tu solicitud será revisada por el equipo</li>
              <li>Tu propuesta de charla será evaluada</li>
              <li>Recibirás notificaciones sobre el estado</li>
            </ul>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="w-full px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
          >
            Ir a mi perfil
          </button>
        </div>
      </div>
    );
  }



  // Main form
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            🎯 Aplicación de Speaker
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Conviértete en speaker de AWS User Group Puebla y propón tu primera charla.
          </p>
        </div>



        {/* Info banner for existing speakers */}
        {profile?.role === 'SPEAKER' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>💡 Ya eres speaker:</strong> Puedes proponer charlas directamente en{' '}
              <button
                onClick={() => router.push('/speaker/propose-talk')}
                className="underline font-semibold hover:text-amber-700"
              >
                la sección de propuestas
              </button>
              .
            </p>
          </div>
        )}

        {/* Form */}
        <UnifiedSpeakerProposalForm
          userId={user?.userId || ''}
          userEmail={(userAttributes?.email as string) || ''}
          userName={profile ? `${profile.givenName} ${profile.familyName}`.trim() : ''}
          userPhone={profile?.phoneNumber}
          userCompany={profile?.company}
          userJobTitle={profile?.jobTitle}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/')}
        />
      </div>
    </main>
  );
}