#!/usr/bin/env node

/**
 * 📊 SCRIPT DE MIGRACIÓN DE DATOS HISTÓRICOS
 * 
 * Carga datos desde CSVs limpios directamente a la BD usando Amplify Schemas
 * 
 * Ejecución:
 * npx tsx scripts/migrate-historical-data.ts
 * 
 * Flujo:
 * 1. Leer CSVs limpios
 * 2. Crear Users (deduplicado por email)
 * 3. Crear Events
 * 4. Crear EventRegistrations
 * 5. Crear TalkProposals
 * 6. Reporte final
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { v4 as uuid } from 'uuid';

// ============================================================================
// TIPOS
// ============================================================================

interface UserRow {
  id: string;
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
  speakerPhotoKey: string;
  speakerCvKey: string;
  role: 'MEMBER' | 'SPEAKER';
  source: 'ASISTENCIA' | 'SPEAKERS' | 'BOTH';
}

interface EventRow {
  id: string;
  title: string;
  slug: string;
  eventDate: string;
  eventDateConfidence: string;
}

interface RegistrationRow {
  id: string;
  eventId: string;
  email: string;
  registeredAt: string;
  status: string;
  isFirstTime: string;
  howFound: string;
  awsExperience: string;
  motivation: string;
  registrationId: string;
}

interface TalkProposalRow {
  id: string;
  email: string;
  talkTitle: string;
  description: string;
  duration: string;
  proposedDate: string;
  proposedTimeSlot: string;
  linkedInUrl: string;
  expertiseArea: string;
  photoLink: string;
  cvLink: string;
  submittedAt: string;
  speakerId: string;
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function generateUserId(): string {
  // En Amplify, los IDs de User vienen de Cognito
  // Para migración, usaremos un UUID que después deberá mapearse
  return 'user_' + uuid().replace(/-/g, '').substring(0, 16);
}

function parseInterests(interestsStr: string): string[] {
  if (!interestsStr) return ['LEARNING'];
  return interestsStr.split('|').map(i => i.trim()).filter(i => i);
}

function parseHowFound(howFoundStr: string): string[] {
  if (!howFoundStr) return [];
  return howFoundStr.split('|').map(h => h.trim()).filter(h => h);
}

function generateId(): string {
  return uuid().replace(/-/g, '').substring(0, 16);
}

// ============================================================================
// LECTURA DE CSVs
// ============================================================================

function readCleanedCsvs() {
  const baseDir = './data-testing/cleaned';
  
  console.log('📖 Leyendo CSVs limpios...\n');
  
  const usersRaw = parse(fs.readFileSync(path.join(baseDir, 'users-cleaned.csv'), 'utf-8'), { columns: true }) as UserRow[];
  const eventsRaw = parse(fs.readFileSync(path.join(baseDir, 'events-cleaned.csv'), 'utf-8'), { columns: true }) as EventRow[];
  const registrationsRaw = parse(fs.readFileSync(path.join(baseDir, 'event-registrations-cleaned.csv'), 'utf-8'), { columns: true }) as RegistrationRow[];
  const proposalsRaw = parse(fs.readFileSync(path.join(baseDir, 'talk-proposals-cleaned.csv'), 'utf-8'), { columns: true }) as TalkProposalRow[];
  
  console.log(`✅ Usuarios: ${usersRaw.length}`);
  console.log(`✅ Eventos: ${eventsRaw.length}`);
  console.log(`✅ Registros: ${registrationsRaw.length}`);
  console.log(`✅ Propuestas: ${proposalsRaw.length}\n`);
  
  return { usersRaw, eventsRaw, registrationsRaw, proposalsRaw };
}

// ============================================================================
// TRANSFORMACIÓN DE DATOS PARA AMPLIFY
// ============================================================================

interface UserToInsert {
  id: string;
  email: string;
  givenName: string;
  familyName: string;
  phoneNumber?: string;
  company: string;
  jobTitle: string;
  awsExperienceLevel: 'PROFESSIONAL' | 'PERSONAL' | 'NONE' | 'LEARNING';
  interests?: string[];
  linkedInUrl?: string;
  expertiseArea?: string;
  speakerPhotoKey?: string;
  speakerCvKey?: string;
  role: 'MEMBER' | 'SPEAKER' | 'ADMIN';
  profileCompleted: boolean;
  onboardingCompletedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface EventToInsert {
  id: string;
  title: string;
  description: string;
  slug: string;
  startDate: string;
  endDate: string;
  timezone: string;
  location: string;
  eventType: 'TALK' | 'WORKSHOP' | 'MEETUP' | 'NETWORKING';
  topics?: string[];
  maxAttendees?: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  isPublic: boolean;
  speakerId: string;
  speakerName: string;
  speakerEmail: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  goingCount: number;
  checkedInCount: number;
  invitedCount: number;
  notGoingCount: number;
}

interface RegistrationToInsert {
  id: string;
  eventId: string;
  userId?: string;
  userName: string;
  userEmail: string;
  status: 'GOING' | 'NOT_GOING' | 'INVITED' | 'WAITLIST';
  registeredAt: string;
  checkedIn: boolean;
  registrationAnswers?: Record<string, any>;
}

interface ProposalToInsert {
  id: string;
  userId: string;
  speakerName: string;
  speakerEmail: string;
  title: string;
  description: string;
  topics?: string[];
  duration: number;
  targetAudience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  proposedDate: string;
  proposedTimeSlot: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EVENT_CREATED';
  submittedAt: string;
  updatedAt: string;
}

function transformUsers(usersRaw: UserRow[]): { users: UserToInsert[]; emailToUserId: Map<string, string> } {
  const users: UserToInsert[] = [];
  const emailToUserId = new Map<string, string>();
  const now = new Date().toISOString();
  
  for (const raw of usersRaw) {
    const userId = generateUserId();
    
    const user: UserToInsert = {
      id: userId,
      email: raw.email,
      givenName: raw.givenName,
      familyName: raw.familyName,
      phoneNumber: raw.phoneNumber || undefined,
      company: raw.company,
      jobTitle: raw.jobTitle,
      awsExperienceLevel: (raw.awsExperienceLevel || 'NONE') as 'PROFESSIONAL' | 'PERSONAL' | 'NONE' | 'LEARNING',
      interests: parseInterests(raw.interests),
      linkedInUrl: raw.linkedInUrl || undefined,
      expertiseArea: raw.expertiseArea || undefined,
      speakerPhotoKey: raw.speakerPhotoKey || undefined,
      speakerCvKey: raw.speakerCvKey || undefined,
      role: (raw.role || 'MEMBER') as 'MEMBER' | 'SPEAKER' | 'ADMIN',
      profileCompleted: true, // Ya completaron onboarding
      onboardingCompletedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    
    users.push(user);
    emailToUserId.set(raw.email, userId);
  }
  
  return { users, emailToUserId };
}

function transformEvents(eventsRaw: EventRow[], adminUserId: string): EventToInsert[] {
  const events: EventToInsert[] = [];
  const now = new Date().toISOString();
  
  for (const raw of eventsRaw) {
    const startDate = new Date(raw.eventDate);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1); // 1 hora de duración default
    
    const event: EventToInsert = {
      id: raw.id,
      title: raw.title,
      description: `Evento histórico: ${raw.title}`,
      slug: raw.slug,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: 'America/Mexico_City',
      location: 'AWS User Group Puebla',
      eventType: 'MEETUP',
      topics: [],
      status: 'COMPLETED', // Eventos históricos están completados
      isPublic: true,
      speakerId: adminUserId,
      speakerName: 'AWS User Group Puebla',
      speakerEmail: 'admin@awsug.mx',
      createdBy: adminUserId,
      createdAt: now,
      updatedAt: now,
      goingCount: 0, // Se actualiza cuando creas registrations
      checkedInCount: 0,
      invitedCount: 0,
      notGoingCount: 0,
    };
    
    events.push(event);
  }
  
  return events;
}

function transformRegistrations(
  registrationsRaw: RegistrationRow[],
  emailToUserId: Map<string, string>
): RegistrationToInsert[] {
  const registrations: RegistrationToInsert[] = [];
  
  for (const raw of registrationsRaw) {
    const userId = emailToUserId.get(raw.email);
    
    if (!userId) {
      console.warn(`⚠️  Usuario no encontrado para email: ${raw.email}`);
      continue;
    }
    
    const registration: RegistrationToInsert = {
      id: generateId(),
      eventId: raw.eventId,
      userId,
      userName: `${raw.email}`, // El nombre se obtiene del User
      userEmail: raw.email,
      status: 'GOING',
      registeredAt: raw.registeredAt || new Date().toISOString(),
      checkedIn: true, // Eventos históricos están completos
      registrationAnswers: {
        isFirstTime: raw.isFirstTime === 'true',
        howFound: parseHowFound(raw.howFound),
        awsExperience: raw.awsExperience,
        motivation: raw.motivation,
      },
    };
    
    registrations.push(registration);
  }
  
  return registrations;
}

function transformProposals(proposalsRaw: TalkProposalRow[], emailToUserId: Map<string, string>): ProposalToInsert[] {
  const proposals: ProposalToInsert[] = [];
  const now = new Date().toISOString();
  
  for (const raw of proposalsRaw) {
    const userId = emailToUserId.get(raw.email);
    
    if (!userId) {
      console.warn(`⚠️  Speaker no encontrado para email: ${raw.email}`);
      continue;
    }
    
    const proposal: ProposalToInsert = {
      id: generateId(),
      userId,
      speakerName: `${raw.email}`, // El nombre se obtiene del User
      speakerEmail: raw.email,
      title: raw.talkTitle,
      description: raw.description,
      topics: raw.description.toLowerCase().includes('aws') ? ['AWS'] : [],
      duration: parseInt(raw.duration, 10) || 45,
      targetAudience: 'ALL',
      proposedDate: raw.proposedDate,
      proposedTimeSlot: raw.proposedTimeSlot,
      status: 'APPROVED', // Propuestas históricas están aprobadas
      submittedAt: raw.submittedAt || now,
      updatedAt: now,
    };
    
    proposals.push(proposal);
  }
  
  return proposals;
}

// ============================================================================
// MIGRACIÓN (SIMULADA - SIN AMPLIFY CLIENT REAL)
// ============================================================================

interface MigrationReport {
  usersCreated: number;
  eventsCreated: number;
  registrationsCreated: number;
  proposalsCreated: number;
  errors: string[];
  warnings: string[];
  duration: number;
}

async function migrateData(
  users: UserToInsert[],
  events: EventToInsert[],
  registrations: RegistrationToInsert[],
  proposals: ProposalToInsert[]
): Promise<MigrationReport> {
  const startTime = Date.now();
  const report: MigrationReport = {
    usersCreated: 0,
    eventsCreated: 0,
    registrationsCreated: 0,
    proposalsCreated: 0,
    errors: [],
    warnings: [],
    duration: 0,
  };
  
  console.log('\n⚙️  INICIANDO MIGRACIÓN\n');
  console.log('=' .repeat(60));
  
  // En un escenario real, aquí usarías:
  // const client = generateClient<Schema>();
  
  // 1. Crear Users
  console.log('\n📝 Migrando Users...');
  try {
    // for (const user of users) {
    //   await client.models.User.create(user);
    // }
    // Por ahora: simulamos la creación
    console.log(`   ✅ ${users.length} usuarios listos para crear`);
    report.usersCreated = users.length;
  } catch (err: any) {
    report.errors.push(`Error creando users: ${err.message}`);
  }
  
  // 2. Crear Events
  console.log('\n📅 Migrando Events...');
  try {
    // for (const event of events) {
    //   await client.models.Event.create(event);
    // }
    console.log(`   ✅ ${events.length} eventos listos para crear`);
    report.eventsCreated = events.length;
  } catch (err: any) {
    report.errors.push(`Error creando events: ${err.message}`);
  }
  
  // 3. Crear EventRegistrations
  console.log('\n🎟️  Migrando EventRegistrations...');
  try {
    // for (const reg of registrations) {
    //   await client.models.EventRegistration.create(reg);
    // }
    console.log(`   ✅ ${registrations.length} registros listos para crear`);
    report.registrationsCreated = registrations.length;
  } catch (err: any) {
    report.errors.push(`Error creando registrations: ${err.message}`);
  }
  
  // 4. Crear TalkProposals
  console.log('\n🎤 Migrando TalkProposals...');
  try {
    // for (const proposal of proposals) {
    //   await client.models.TalkProposal.create(proposal);
    // }
    console.log(`   ✅ ${proposals.length} propuestas listos para crear`);
    report.proposalsCreated = proposals.length;
  } catch (err: any) {
    report.errors.push(`Error creando proposals: ${err.message}`);
  }
  
  report.duration = Date.now() - startTime;
  return report;
}

// ============================================================================
// GENERADOR DE SCRIPT AMPLIFY
// ============================================================================

function generateAmplifyMigrationCode(
  users: UserToInsert[],
  events: EventToInsert[],
  registrations: RegistrationToInsert[],
  proposals: ProposalToInsert[]
) {
  const code = `
/**
 * 🚀 CÓDIGO DE MIGRACIÓN PARA EJECUTAR EN AMPLIFY
 * 
 * Este código está listo para ser ejecutado con:
 * - Una función Lambda
 * - Un script local con Amplify CLI
 * - Directamente en un endpoint API
 */

import { generateClient } from 'aws-amplify/api';
import type { Schema } from './amplify/data/resource';

const client = generateClient<Schema>();

async function migrateHistoricalData() {
  console.log('🚀 Iniciando migración de datos históricos...');
  
  const stats = {
    usersCreated: 0,
    eventsCreated: 0,
    registrationsCreated: 0,
    proposalsCreated: 0,
    errors: [] as string[]
  };
  
  try {
    // 1. Crear Users
    console.log('📝 Creando usuarios...');
    const usersData = ${JSON.stringify(users, null, 2)};
    for (const user of usersData) {
      try {
        await client.models.User.create(user);
        stats.usersCreated++;
      } catch (err: any) {
        stats.errors.push(\`Error creando user \${user.email}: \${err.message}\`);
      }
    }
    
    // 2. Crear Events
    console.log('📅 Creando eventos...');
    const eventsData = ${JSON.stringify(events, null, 2)};
    for (const event of eventsData) {
      try {
        await client.models.Event.create(event);
        stats.eventsCreated++;
      } catch (err: any) {
        stats.errors.push(\`Error creando event \${event.slug}: \${err.message}\`);
      }
    }
    
    // 3. Crear EventRegistrations
    console.log('🎟️  Creando registros de eventos...');
    const registrationsData = ${JSON.stringify(registrations, null, 2)};
    for (const reg of registrationsData) {
      try {
        await client.models.EventRegistration.create(reg);
        stats.registrationsCreated++;
      } catch (err: any) {
        stats.errors.push(\`Error creando registration: \${err.message}\`);
      }
    }
    
    // 4. Crear TalkProposals
    console.log('🎤 Creando propuestas de charlas...');
    const proposalsData = ${JSON.stringify(proposals, null, 2)};
    for (const proposal of proposalsData) {
      try {
        await client.models.TalkProposal.create(proposal);
        stats.proposalsCreated++;
      } catch (err: any) {
        stats.errors.push(\`Error creando proposal: \${err.message}\`);
      }
    }
    
    console.log('✅ Migración completada:');
    console.log(\`  - Usuarios: \${stats.usersCreated}\`);
    console.log(\`  - Eventos: \${stats.eventsCreated}\`);
    console.log(\`  - Registros: \${stats.registrationsCreated}\`);
    console.log(\`  - Propuestas: \${stats.proposalsCreated}\`);
    
    if (stats.errors.length > 0) {
      console.log(\`\\n⚠️  Errores encontrados (\${stats.errors.length}):\`);
      stats.errors.forEach(err => console.log(\`  - \${err}\`));
    }
    
    return stats;
  } catch (err) {
    console.error('❌ Error fatal en migración:', err);
    throw err;
  }
}

// Ejecutar migración
migrateHistoricalData().then(() => {
  console.log('\\n🎉 ¡Migración completada!');
  process.exit(0);
}).catch(err => {
  console.error('\\n❌ ¡Migración fallida!', err);
  process.exit(1);
});
`;

  return code;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 SCRIPT DE MIGRACIÓN DE DATOS HISTÓRICOS                ║');
  console.log('║     Amplify Gen 2 - AWS User Group Puebla                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    // 1. Leer CSVs
    const { usersRaw, eventsRaw, registrationsRaw, proposalsRaw } = readCleanedCsvs();
    
    // 2. Transformar datos
    console.log('\n🔄 Transformando datos...\n');
    const { users, emailToUserId } = transformUsers(usersRaw);
    const adminUserId = users[0].id; // Usar primer usuario como admin
    const events = transformEvents(eventsRaw, adminUserId);
    const registrations = transformRegistrations(registrationsRaw, emailToUserId);
    const proposals = transformProposals(proposalsRaw, emailToUserId);
    
    console.log('✅ Transformación completa\n');
    
    // 3. Ejecutar migración (simulada)
    const report = await migrateData(users, events, registrations, proposals);
    
    // 4. Mostrar reporte
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 REPORTE DE MIGRACIÓN\n');
    console.log(`✅ Usuarios creados: ${report.usersCreated}`);
    console.log(`✅ Eventos creados: ${report.eventsCreated}`);
    console.log(`✅ Registros creados: ${report.registrationsCreated}`);
    console.log(`✅ Propuestas creadas: ${report.proposalsCreated}`);
    
    if (report.errors.length > 0) {
      console.log(`\n⚠️  Errores (${report.errors.length}):`);
      report.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log(`\n⏱️  Duración: ${report.duration}ms`);
    
    // 5. Generar código listo para Amplify
    console.log('\n' + '='.repeat(60));
    console.log('\n📝 Generando código de migración para Amplify...\n');
    
    const amplifyCode = generateAmplifyMigrationCode(users, events, registrations, proposals);
    
    const outputPath = './scripts/amplify-migration-exec.ts';
    fs.writeFileSync(outputPath, amplifyCode);
    
    console.log(`✅ Código de migración guardado en: ${outputPath}`);
    console.log(`   \n   Para ejecutar en tu proyec to:\n   npx tsx ${outputPath}`);
    
    // 6. Guardar datos transformados como backup
    console.log('\n📦 Guardando datos transformados como backup...\n');
    
    fs.writeFileSync(
      './data-testing/cleaned/users-transformed.json',
      JSON.stringify(users, null, 2)
    );
    console.log('✅ users-transformed.json');
    
    fs.writeFileSync(
      './data-testing/cleaned/events-transformed.json',
      JSON.stringify(events, null, 2)
    );
    console.log('✅ events-transformed.json');
    
    fs.writeFileSync(
      './data-testing/cleaned/registrations-transformed.json',
      JSON.stringify(registrations, null, 2)
    );
    console.log('✅ registrations-transformed.json');
    
    fs.writeFileSync(
      './data-testing/cleaned/proposals-transformed.json',
      JSON.stringify(proposals, null, 2)
    );
    console.log('✅ proposals-transformed.json');
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✨ ¡MIGRACIÓN PREPARADA EXITOSAMENTE!');
    console.log('\n📌 PRÓXIMOS PASOS:\n');
    console.log('1. Revisar los archivos JSON transformados');
    console.log('2. Ejecutar: npx tsx scripts/amplify-migration-exec.ts');
    console.log('3. Verificar datos en Amplify Console\n');
    
  } catch (err) {
    console.error('\n❌ Error fatal:', err);
    process.exit(1);
  }
}

main();
