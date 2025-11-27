'use client';

import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';

const client = generateClient<Schema>();

type SpeakerApplication = Schema['SpeakerApplication']['type'];

interface SpeakerApplicationStatusProps {
  userId: string;
}

export default function SpeakerApplicationStatus({ userId }: SpeakerApplicationStatusProps) {
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<SpeakerApplication | null>(null);

  useEffect(() => {
    loadApplication();
  }, [userId]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      
      // Buscar aplicaciones del usuario
      const result = await client.models.SpeakerApplication.list({
        filter: {
          userId: {
            eq: userId
          }
        },
        limit: 1,
        // @ts-ignore - sortDirection existe pero TypeScript no lo reconoce
        sortDirection: 'DESC'
      });

      if (result.data && result.data.length > 0) {
        setApplication(result.data[0]);
      }
    } catch (error) {
      console.error('Error loading application:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (!application) {
    return null;
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-600" />,
          badge: <Badge variant="warning">Pendiente</Badge>,
          title: 'Postulación en Revisión',
          description: 'Tu postulación está siendo revisada por nuestro equipo.',
          color: 'yellow'
        };
      case 'APPROVED':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          badge: <Badge variant="success">Aprobada</Badge>,
          title: '¡Felicidades! Eres Speaker',
          description: 'Tu postulación ha sido aprobada. Ya tienes acceso a funciones exclusivas para speakers.',
          color: 'green'
        };
      case 'REJECTED':
        return {
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          badge: <Badge variant="warning" className="bg-red-50 text-red-700 border-red-300">Rechazada</Badge>,
          title: 'Postulación No Aprobada',
          description: application.rejectionReason || 'Tu postulación no fue aprobada en esta ocasión.',
          color: 'red'
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-gray-600" />,
          badge: <Badge variant="default">Desconocido</Badge>,
          title: 'Estado Desconocido',
          description: 'No pudimos determinar el estado de tu postulación.',
          color: 'gray'
        };
    }
  };

  const statusInfo = getStatusInfo(application.status || 'PENDING');
  const submittedDate = application.submittedAt ? new Date(application.submittedAt).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Fecha desconocida';

  return (
    <Card className={`border-${statusInfo.color}-200 bg-${statusInfo.color}-50`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusInfo.icon}
            <CardTitle className={`text-${statusInfo.color}-900`}>
              {statusInfo.title}
            </CardTitle>
          </div>
          {statusInfo.badge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className={`text-${statusInfo.color}-800`}>
          {statusInfo.description}
        </CardDescription>

        <div className="rounded-lg bg-white p-4 space-y-3 text-sm">
          <div>
            <p className="font-semibold text-gray-900">Fecha de postulación:</p>
            <p className="text-gray-600">{submittedDate}</p>
          </div>

          {application.motivation && (
            <div>
              <p className="font-semibold text-gray-900">Tu motivación:</p>
              <p className="text-gray-600 italic">&ldquo;{application.motivation}&rdquo;</p>
            </div>
          )}

          {application.topics && application.topics.length > 0 && (
            <div>
              <p className="font-semibold text-gray-900">Temas propuestos:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {application.topics.map((topic: string | null, index: number) => (
                  <Badge key={index} variant="primary" size="sm">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {application.reviewedAt && (
            <div>
              <p className="font-semibold text-gray-900">Fecha de revisión:</p>
              <p className="text-gray-600">
                {new Date(application.reviewedAt).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>

        {application.status === 'APPROVED' && (
          <div className="rounded-lg bg-green-100 border border-green-300 p-3">
            <p className="text-sm text-green-900 font-medium">
              🎉 ¡Bienvenido al equipo de Speakers de AWS Puebla!
            </p>
            <p className="text-xs text-green-800 mt-1">
              Ahora puedes proponer charlas y acceder a recursos exclusivos para speakers.
            </p>
          </div>
        )}

        {application.status === 'PENDING' && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm text-blue-900">
              📧 Te notificaremos por email cuando tu postulación sea revisada.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
