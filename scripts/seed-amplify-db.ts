#!/usr/bin/env node

/**
 * 🚀 SCRIPT DE INSERCIÓN DE DATOS EN AMPLIFY
 * 
 * Lee CSVs limpios e inserta directamente en la BD Amplify
 * 
 * Ejecución:
 * npx tsx scripts/seed-amplify-db.ts
 * 
 * REQUISITOS:
 * - Amplify sandbox ejecutándose: amplify sandbox
 * - CSVs limpios en data-testing/cleaned/
 * - Variables de entorno configuradas si es necesario
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
const client = generateClient<Schema>();

// ============================================================================
// TIPOS
// ============================================================================

interface UserRow {
  email: string;
  givenName: string;
  familyName: string;
  phoneNumber: string;
  company: string;
  jobTitle: string;
  awsExperienceLevel: string;
  interests: string;
  linkedInUrl: string;
  expertiseArea: string;
}

interface EventRow {
  id: string;
  title: string;
  slug: string;
  eventDate: string;
}

interface RegistrationRow {
  eventId: string;
  email: string;
  registeredAt: string;
  isFirstTime: string;
  howFound: string;
  awsExperience: string;
  motivation: string;
}

interface ProposalRow {
  email: string;
  talkTitle: string;
  description: string;
  duration: string;
  proposedDate: string;
  proposedTimeSlot: string;
  submittedAt: string;
}

// ============================================================================
// UTILIDADES
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

function parseInterests(str: string): string[] {
  if (!str) return [];
  return str.split('|').map(i => i.trim()).filter(i => i);
}

// ============================================================================
// LEER CSVs
// ============================================================================

function readCsvs() {
  const baseDir = './data-testing/cleaned';
  
  console.log('📖 Leyendo CSVs...\n');
  
  const users = parse(fs.readFileSync(path.join(baseDir, 'users-cleaned.csv'), 'utf-8'), { 
    columns: true 
  }) as UserRow[];
  
  const events = parse(fs.readFileSync(path.join(baseDir, 'events-cleaned.csv'), 'utf-8'), { 
    columns: true 
  }) as EventRow[];
  
  const registrations = parse(fs.readFileSync(path.join(baseDir, 'event-registrations-cleaned.csv'), 'utf-8'), { 
    columns: true 
  }) as RegistrationRow[];
  
  const proposals = parse(fs.readFileSync(path.join(baseDir, 'talk-proposals-cleaned.csv'), 'utf-8'), { 
    columns: true 
  }) as ProposalRow[];
  
  console.log(`✅ ${users.length} usuarios`);
  console.log(`✅ ${events.length} eventos`);
  console.log(`✅ ${registrations.length} registros`);
  console.log(`✅ ${proposals.length} propuestas\n`);
  
  return { users, events, registrations, proposals };
}

// ============================================================================
// INSERTAR DATOS
// ============================================================================

async function seedDatabase() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 INSERTANDO DATOS EN AMPLIFY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const stats = {
    usersCreated: 0,
    eventCreated: 0,
    registrationsCreated: 0,
    proposalsCreated: 0,
    errors: [] as string[],
  };
  
  const emailToUserId = new Map<string, string>();
  
  try {
    // 1️⃣ INSERTAR USUARIOS
    console.log('📝 Insertando usuarios...');
    const { users } = readCsvs();
    
    for (const user of users) {
      try {
        const userData = {
          id: generateId(),
          email: user.email,
          givenName: user.givenName,
          familyName: user.familyName,
          company: user.company || 'No especificado',
          jobTitle: user.jobTitle || 'No especificado',
          awsExperienceLevel: (user.awsExperienceLevel || 'NONE') as any,
          role: (user.expertiseArea ? 'SPEAKER' : 'MEMBER') as any,
          interests: parseInterests(user.interests),
          linkedInUrl: user.linkedInUrl || undefined,
          expertiseArea: user.expertiseArea || undefined,
          phoneNumber: user.phoneNumber || undefined,
          profileCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        };
        
        // @ts-ignore - Amplify types
        const result = await client.models.User.create(userData);
        emailToUserId.set(user.email, result.data?.id || userData.id);
        stats.usersCreated++;
        process.stdout.write('.');
      } catch (err: any) {
        const msg = `User ${user.email}: ${err.message}`;
        stats.errors.push(msg);
        process.stdout.write('E');
      }
    }
    console.log(`\n✅ ${stats.usersCreated}/${users.length} usuarios insertados\n`);
    
    // 2️⃣ INSERTAR EVENTOS
    console.log('📅 Insertando eventos...');
    const { events } = readCsvs();
    const adminUserId = Array.from(emailToUserId.values())[0]; // Primer usuario como admin
    
    for (const event of events) {
      try {
        const startDate = new Date(event.eventDate);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        
        const eventData = {
          id: event.id,
          title: event.title,
          description: `Evento histórico: ${event.title}`,
          slug: event.slug,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          timezone: 'America/Mexico_City',
          location: 'AWS User Group Puebla',
          eventType: 'MEETUP' as any,
          isPublic: true,
          status: 'COMPLETED' as any,
          createdBy: adminUserId,
          speakerId: adminUserId,
          speakerEmail: 'admin@awsug.mx',
          speakerName: 'AWS User Group Puebla',
        };
        
        // @ts-ignore
        await client.models.Event.create(eventData);
        stats.eventCreated++;
        process.stdout.write('.');
      } catch (err: any) {
        stats.errors.push(`Event ${event.slug}: ${err.message}`);
        process.stdout.write('E');
      }
    }
    console.log(`\n✅ ${stats.eventCreated}/${events.length} eventos insertados\n`);
    
    // 3️⃣ INSERTAR REGISTRACIONES
    console.log('🎟️  Insertando registraciones...');
    const { registrations } = readCsvs();
    
    for (const reg of registrations) {
      try {
        const userId = emailToUserId.get(reg.email);
        if (!userId) {
          stats.errors.push(`Registration ${reg.email}: Usuario no encontrado`);
          continue;
        }
        
        const regData = {
          id: generateId(),
          eventId: reg.eventId,
          userId,
          userName: reg.email,
          userEmail: reg.email,
          status: 'GOING' as any,
          checkedIn: true,
          registeredAt: reg.registeredAt || new Date().toISOString(),
          registrationAnswers: {
            isFirstTime: reg.isFirstTime === 'true',
            howFound: reg.howFound ? reg.howFound.split('|') : [],
            awsExperience: reg.awsExperience,
            motivation: reg.motivation,
          },
        };
        
        // @ts-ignore
        await client.models.EventRegistration.create(regData);
        stats.registrationsCreated++;
        process.stdout.write('.');
      } catch (err: any) {
        stats.errors.push(`Registration ${reg.email}: ${err.message}`);
        process.stdout.write('E');
      }
    }
    console.log(`\n✅ ${stats.registrationsCreated}/${registrations.length} registraciones insertadas\n`);
    
    // 4️⃣ INSERTAR PROPUESTAS
    console.log('🎤 Insertando propuestas de charlas...');
    const { proposals } = readCsvs();
    
    for (const proposal of proposals) {
      try {
        const userId = emailToUserId.get(proposal.email);
        if (!userId) {
          stats.errors.push(`Proposal ${proposal.talkTitle}: Usuario no encontrado`);
          continue;
        }
        
        const propData = {
          id: generateId(),
          userId,
          speakerName: proposal.email,
          speakerEmail: proposal.email,
          title: proposal.talkTitle,
          description: proposal.description,
          topics: ['AWS'],
          duration: parseInt(proposal.duration, 10) || 45,
          targetAudience: 'ALL' as any,
          proposedDate: proposal.proposedDate,
          proposedTimeSlot: proposal.proposedTimeSlot || '18:30-19:30',
          status: 'APPROVED' as any,
          submittedAt: proposal.submittedAt || new Date().toISOString(),
        };
        
        // @ts-ignore
        await client.models.TalkProposal.create(propData);
        stats.proposalsCreated++;
        process.stdout.write('.');
      } catch (err: any) {
        stats.errors.push(`Proposal ${proposal.talkTitle}: ${err.message}`);
        process.stdout.write('E');
      }
    }
    console.log(`\n✅ ${stats.proposalsCreated}/${proposals.length} propuestas insertadas\n`);
    
  } catch (err) {
    console.error('\n❌ Error fatal:', err);
    process.exit(1);
  }
  
  // 📊 REPORTE FINAL
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 REPORTE FINAL\n');
  console.log(`✅ Usuarios:       ${stats.usersCreated}`);
  console.log(`✅ Eventos:        ${stats.eventCreated}`);
  console.log(`✅ Registraciones: ${stats.registrationsCreated}`);
  console.log(`✅ Propuestas:     ${stats.proposalsCreated}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errores (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach(err => console.log(`  • ${err}`));
    if (stats.errors.length > 10) {
      console.log(`  ... y ${stats.errors.length - 10} errores más`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✨ ¡INSERCIÓN COMPLETADA!\n');
}

// ============================================================================
// MAIN
// ============================================================================

seedDatabase().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
