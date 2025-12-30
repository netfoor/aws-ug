#!/usr/bin/env node

/**
 * 🎯 SCRIPT SIMPLIFICADO: Solo insertar eventos históricos
 * 
 * Este script solo inserta los 3 eventos históricos como "COMPLETED"
 * sin intentar crear usuarios ni registraciones (que requieren Cognito).
 * 
 * REQUISITOS:
 * 1. Tener un usuario admin en Cognito (tú)
 * 2. Amplify sandbox ejecutándose: amplify sandbox
 * 3. Modificar temporalmente data/resource.ts (ver instrucciones abajo)
 * 
 * PASOS:
 * 1. Agrega esto a Event model en data/resource.ts:
 *    .authorization((allow) => [
 *      allow.publicApiKey(),  // 🔥 TEMPORAL - eliminar después
 *      // ... resto de reglas
 *    ])
 * 
 * 2. Agrega esto en defineData:
 *    authorizationModes: {
 *      defaultAuthorizationMode: 'userPool',
 *      apiKeyAuthorizationMode: { expiresInDays: 7 },
 *    }
 * 
 * 3. Ejecuta: npx tsx scripts/seed-historical-events.ts
 * 
 * 4. ⚠️ IMPORTANTE: Elimina las reglas temporales después
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json' assert { type: 'json' };
import type { Schema } from '../amplify/data/resource';

// Configurar Amplify
Amplify.configure(outputs);
const client = generateClient<Schema>({
  authMode: 'apiKey', // 🔑 Usar API Key en lugar de userPool
});

interface EventRow {
  id: string;
  title: string;
  slug: string;
  eventDate: string;
}

function readEvents(): EventRow[] {
  const csvPath = './data-testing/cleaned/events-cleaned.csv';
  const content = fs.readFileSync(csvPath, 'utf-8');
  return parse(content, { columns: true }) as EventRow[];
}

async function seedHistoricalEvents() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  📅 INSERTANDO EVENTOS HISTÓRICOS                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const events = readEvents();
  let created = 0;
  const errors: string[] = [];
  
  console.log(`📖 Encontrados ${events.length} eventos en CSV\n`);
  
  // Usar un userId genérico para eventos históricos
  // En producción, usa tu propio userId de admin
  const SYSTEM_USER_ID = 'historical-system';
  
  for (const event of events) {
    try {
      const startDate = new Date(event.eventDate);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2); // 2 horas de duración
      
      const eventData = {
        id: event.id,
        title: event.title,
        description: `Evento histórico del AWS User Group Puebla: ${event.title}`,
        slug: event.slug,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timezone: 'America/Mexico_City',
        location: 'AWS User Group Puebla',
        locationAddress: 'Puebla, México',
        eventType: 'MEETUP' as const,
        topics: ['AWS', 'Cloud Computing'],
        isPublic: true,
        status: 'COMPLETED' as const,
        isVirtual: false,
        isUnlimited: true,
        createdBy: SYSTEM_USER_ID,
        speakerId: SYSTEM_USER_ID,
        speakerEmail: 'admin@awsug.mx',
        speakerName: 'AWS User Group Puebla',
        createdAt: new Date().toISOString(),
        publishedAt: startDate.toISOString(),
        // Stats (datos históricos aproximados)
        goingCount: 0,
        checkedInCount: 0,
        invitedCount: 0,
        notGoingCount: 0,
      };
      
      // @ts-ignore - Tipos de Amplify
      const result = await client.models.Event.create(eventData);
      
      if (result.data) {
        created++;
        console.log(`✅ ${event.title} (${event.eventDate})`);
      } else {
        errors.push(`${event.slug}: No data returned`);
        console.log(`❌ ${event.title}: No data returned`);
      }
      
    } catch (err: any) {
      const msg = `${event.slug}: ${err.message}`;
      errors.push(msg);
      console.log(`❌ ${event.title}: ${err.message}`);
    }
  }
  
  // Reporte final
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 RESUMEN:\n`);
  console.log(`✅ Eventos creados: ${created}/${events.length}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️  Errores (${errors.length}):`);
    errors.forEach(err => console.log(`  • ${err}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (created > 0) {
    console.log('\n✨ ¡Eventos históricos insertados correctamente!\n');
    console.log('⚠️  RECUERDA: Elimina las reglas temporales de autorización:');
    console.log('   - allow.publicApiKey() en Event model');
    console.log('   - apiKeyAuthorizationMode en defineData\n');
  } else {
    console.log('\n❌ No se pudo insertar ningún evento.\n');
    console.log('Verifica que hayas agregado las reglas temporales:');
    console.log('1. allow.publicApiKey() en Event model');
    console.log('2. apiKeyAuthorizationMode en defineData\n');
  }
}

seedHistoricalEvents().catch(err => {
  console.error('\n❌ Error fatal:', err);
  console.error('\n💡 Posibles causas:');
  console.error('  1. No agregaste allow.publicApiKey() en Event model');
  console.error('  2. No agregaste apiKeyAuthorizationMode en defineData');
  console.error('  3. Amplify sandbox no está corriendo\n');
  process.exit(1);
});
