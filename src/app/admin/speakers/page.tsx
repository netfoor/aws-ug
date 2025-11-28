'use client';

import React, { useState, useEffect } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { SpeakerApplicationsList } from '@/components/admin/SpeakerApplicationsList';
import { SpeakerApplicationDetail } from '@/components/admin/SpeakerApplicationDetail';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { useAuth } from '@/context/auth-context';
import { Loader2, ShieldAlert } from 'lucide-react';

const client = generateClient<Schema>();

/**
 * 👨‍💼 Panel de Administración de Speakers
 * 
 * Página protegida (solo ADMINS) para gestionar postulaciones.
 * 
 * Funcionalidades:
 * - Dashboard con estadísticas
 * - Lista de postulaciones con filtros
 * - Ver detalles completos
 * - Aprobar postulaciones manualmente
 * - Rechazar con razón personalizada
 */
export default function AdminSpeakersPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [applications, setApplications] = useState<Schema['SpeakerApplication']['type'][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Schema['SpeakerApplication']['type'] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar postulaciones
  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadApplications();
    }
  }, [authLoading, isAdmin]);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, errors } = await client.models.SpeakerApplication.list({
        limit: 1000,
      });

      if (errors && errors.length > 0) {
        console.error('GraphQL Errors:', errors);
        throw new Error('Error al cargar postulaciones');
      }

      // Ordenar por fecha (más recientes primero)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.submittedAt || 0).getTime();
        const dateB = new Date(b.submittedAt || 0).getTime();
        return dateB - dateA;
      });

      setApplications(sorted);
    } catch (err) {
      console.error('Error loading applications:', err);
      setError('Error al cargar las postulaciones. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular estadísticas
  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'PENDING').length,
    approved: applications.filter(app => app.status === 'APPROVED').length,
    rejected: applications.filter(app => app.status === 'REJECTED').length,
  };

  // Ver detalles
  const handleViewDetails = (application: Schema['SpeakerApplication']['type']) => {
    setSelectedApplication(application);
    setIsModalOpen(true);
  };

  // Aprobar postulación
  const handleApprove = async (applicationId: string, userId: string) => {
    try {
      console.log('🎯 Aprobando aplicación:', { applicationId, userId });

      // Invocar Lambda via API route
      const response = await fetch('/api/admin/approve-speaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          userId,
          approvedBy: user?.userId || 'admin',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al aprobar la postulación');
      }

      const result = await response.json();
      console.log('✅ Resultado:', result);

      // Recargar lista
      await loadApplications();

      alert('✅ Postulación aprobada correctamente. Se ha enviado un email al usuario y se agregó al grupo SPEAKERS.');
    } catch (error) {
      console.error('Error al aprobar:', error);
      throw error;
    }
  };

  // Rechazar postulación
  const handleReject = async (applicationId: string, userId: string, reason: string) => {
    try {
      console.log('❌ Rechazando aplicación:', { applicationId, userId, reason });

      // Invocar Lambda via API route
      const response = await fetch('/api/admin/reject-speaker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          userId,
          rejectionReason: reason,
          rejectedBy: user?.userId || 'admin',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al rechazar la postulación');
      }

      const result = await response.json();
      console.log('✅ Resultado:', result);

      // Recargar lista
      await loadApplications();

      alert('✅ Postulación rechazada. Se ha enviado un email al usuario con el feedback.');
    } catch (error) {
      console.error('Error al rechazar:', error);
      throw error;
    }
  };

  // Loading de autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // No es admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Acceso Denegado
          </h1>
          <p className="text-text-secondary mb-6">
            No tienes permisos para acceder al panel de administración.
            Esta página está reservada solo para administradores.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-accent text-white rounded-lg hover:opacity-90 transition-all"
          >
            Volver al Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background theme-transition">
      {/* Header */}
      <div className="bg-surface border-b border-border theme-transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">
                Panel de Administración
              </h1>
              <p className="text-text-secondary mt-1">
                Gestión de postulaciones de speakers
              </p>
            </div>
            <button
              onClick={loadApplications}
              disabled={isLoading}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Actualizar'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg theme-transition">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Dashboard */}
          <AdminDashboard stats={stats} isLoading={isLoading} />

          {/* Lista */}
          <SpeakerApplicationsList
            applications={applications}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {/* Modal de detalles */}
      <SpeakerApplicationDetail
        application={selectedApplication}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedApplication(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
