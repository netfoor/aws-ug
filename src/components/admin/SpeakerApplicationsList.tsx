'use client';

import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, Clock, Calendar, Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Schema } from '../../../amplify/data/resource';

type SpeakerApplication = Schema['SpeakerApplication']['type'];

interface SpeakerApplicationsListProps {
  applications: SpeakerApplication[];
  isLoading?: boolean;
  onViewDetails: (application: SpeakerApplication) => void;
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * 📝 SpeakerApplicationsList
 * 
 * Lista de todas las postulaciones de speakers con filtros.
 * Permite ver detalles, aprobar y rechazar postulaciones.
 */
export function SpeakerApplicationsList({
  applications,
  isLoading = false,
  onViewDetails,
}: SpeakerApplicationsListProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar aplicaciones
  const filteredApplications = applications.filter((app) => {
    const matchesStatus = filterStatus === 'ALL' || app.status === filterStatus;
    const matchesSearch = 
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.motivation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Función para obtener badge según status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="w-3 h-3" />
            Pendiente
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3" />
            Aprobada
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="w-3 h-3" />
            Rechazada
          </span>
        );
      default:
        return null;
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-surface rounded-lg shadow theme-transition">
        <div className="p-6">
          <div className="h-8 w-64 bg-secondary/30 rounded animate-pulse mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-secondary/30 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg shadow theme-transition">
      {/* Header con filtros */}
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Postulaciones de Speakers
        </h3>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por email o motivación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-background text-text-primary theme-transition"
            />
          </div>

          {/* Filtros de status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:flex md:gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2 md:px-4 py-2 rounded-lg text-[10px] sm:text-xs md:text-sm font-medium transition-all theme-transition ${
                  filterStatus === status
                    ? 'bg-accent text-white'
                    : 'bg-background text-text-secondary hover:bg-secondary/30'
                }`}
              >
                {status === 'ALL' ? 'Todas' : status === 'PENDING' ? 'Pendientes' : status === 'APPROVED' ? 'Aprobadas' : 'Rechazadas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de postulaciones */}
      <div className="overflow-x-auto">
        {filteredApplications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-text-secondary">
              No se encontraron postulaciones con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-background theme-transition">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Temas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border theme-transition">
              {filteredApplications.map((application) => (
                <tr 
                  key={application.id}
                  className="hover:bg-background/50 transition-all theme-transition"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/80 to-accent flex items-center justify-center text-white font-semibold">
                        {application.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {application.email}
                        </div>
                        <div className="text-xs text-text-secondary flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {application.userId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(application.status || 'PENDING')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text-primary flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-text-secondary" />
                      {formatDate(application.submittedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {application.topics?.slice(0, 2).map((topic: string | null, index: number) => (
                        topic && (
                          <span 
                            key={index}
                            className="inline-block px-2 py-1 text-xs bg-secondary/30 text-text-primary rounded theme-transition"
                          >
                            {topic}
                          </span>
                        )
                      ))}
                      {application.topics && application.topics.length > 2 && (
                        <span className="inline-block px-2 py-1 text-xs text-text-secondary">
                          +{application.topics.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewDetails(application)}
                      className="inline-flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Ver detalles
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer con contador */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-sm text-text-secondary">
          Mostrando {filteredApplications.length} de {applications.length} postulaciones
        </p>
      </div>
    </div>
  );
}
