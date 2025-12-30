/**
 * 🎯 LAMBDA: manual-approve-speaker
 * 
 * Aprobación MANUAL de postulación de speaker por admin.
 * Similar a approve-speaker-application pero con diferencias:
 * - Triggered por API   console.log(`✅ Email de aprobación enviado: ${email}`);
}
/**
 * Crea TalkProposal automáticamente desde attachedProposal
 */
async function createTalkProposalFromAttached(
  userId: string,
  userEmail: string,
  userName: string,
  attachedProposal: AttachedProposal, 
  applicationTopics: string[],
  talkProposalTableName: string
): Promise<string> {
  const { randomUUID } = await import('crypto');
  
  const now = new Date().toISOString();
  const proposalId = randomUUID();
  
  // Usar el nombre real del usuario
  const speakerName = userName;
  
  await docClient.send(new PutCommand({
    TableName: talkProposalTableName,
    Item: {
      __typename: 'TalkProposal',
      id: proposalId,
      userId,
      speakerName, // Required field
      speakerEmail: userEmail, // Required field
      title: attachedProposal.talkTitle,
      description: attachedProposal.talkDescription,
      topics: applicationTopics.length > 0 ? applicationTopics : ['General'], // Required field - usar topics de la aplicación
      duration: attachedProposal.duration,
      targetAudience: attachedProposal.targetAudience,
      proposedDate: attachedProposal.proposedDate || null,
      proposedTimeSlot: '18:30-19:30', // Default slot
      status: 'PENDING', // Se aprobará cuando se cree el evento en el wizard
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
      owner: userId,
    },
  }));
  
  console.log(`✅ TalkProposal creada automáticamente: ${proposalId}`);
  return proposalId;
}

/**
 * Crea notificación in-app para el usuario
 */
async function createNotification(
  userId: string, 
  notificationTableName: string, 
  hasAttachedProposal: boolean = false,
  talkProposalId?: string
): Promise<void> {
  const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
  const { randomUUID } = await import('crypto');
  
  const now = new Date().toISOString();
  
  const baseMessage = 'Felicitaciones, ahora eres parte del equipo de speakers de AWS User Group Puebla. Tus permisos se actualizarán automáticamente.';
  const proposalMessage = hasAttachedProposal 
    ? ' Tu propuesta de charla ha sido guardada y está siendo revisada para crear el evento.'
    : ' Ya puedes proponer charlas para nuestros próximos eventos.';
  
  await docClient.send(new PutCommand({
    TableName: notificationTableName,
    Item: {
      id: randomUUID(),
      userId,
      type: 'SPEAKER_APPROVED',
      title: '🎉 ¡Tu postulación fue aprobada!',
      message: baseMessage + proposalMessage,
      read: false,
      link: hasAttachedProposal && talkProposalId ? `/admin/talk-proposals?id=${talkProposalId}` : '/speaker/propose-talk',
      icon: '🎤',
      createdAt: now,
      updatedAt: now,
      owner: userId,
    },
  }));
  
  console.log(`✅ Notificación creada para usuario ${userId}`);
}

// ========================================
// 🎯 HANDLER PRINCIPAL
// ========================================y (no EventBridge)
// * - Cancela el schedule automático de EventBridge si existe
// * - Ejecuta inmediatamente (no espera 5 min)
// * 
// * Flujo:
// * 1️⃣ Recibe applicationId del admin panel
// * 2️⃣ Cancela schedule de EventBridge (si existe)
// * 3️⃣ Obtiene datos de DynamoDB
// * 4️⃣ Actualiza status → APPROVED
// * 5️⃣ Agrega usuario a grupo SPEAKERS en Cognito
// * 6️⃣ Envía email de aprobación
// */

import type { Handler } from 'aws-lambda';
import { 
  DynamoDBClient, 
  ListTablesCommand 
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { 
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { 
  SESClient, 
  SendEmailCommand 
} from '@aws-sdk/client-ses';

// ========================================
// 🔧 CONFIGURACIÓN
// ========================================
const TABLE_PREFIX = process.env.SPEAKER_APPLICATION_TABLE_PREFIX || 'SpeakerApplication';
const NOTIFICATION_TABLE_PREFIX = process.env.NOTIFICATION_TABLE_PREFIX || 'Notification';
const USER_TABLE_PREFIX = process.env.USER_TABLE_PREFIX || 'User';
const TALK_PROPOSAL_TABLE_PREFIX = process.env.TALK_PROPOSAL_TABLE_PREFIX || 'TalkProposal';
const USER_POOL_ID = process.env.USER_POOL_ID;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply@awspuebla.foor.dev';
const REGION = process.env.AWS_REGION || 'us-east-1';

// ========================================
// 📦 CLIENTES AWS
// ========================================
const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
const sesClient = new SESClient({ region: REGION });

// ========================================
// 📊 TIPOS
// ========================================
interface ManualApprovalEvent {
  applicationId: string;
  userId: string;
  approvedBy: string; // Admin user ID que aprobó
}

interface SpeakerApplication {
  id: string;
  userId: string;
  email: string;
  motivation: string;
  topics: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  hasAttachedProposal?: boolean;
  attachedProposal?: AttachedProposal; // Ya viene como objeto desde DynamoDB DocumentClient
  professionalProfile?: ProfessionalProfile; // Datos profesionales del speaker
  schedulerArn?: string; // ARN del EventBridge Schedule
}

interface AttachedProposal {
  talkTitle: string;
  talkDescription: string;
  duration: number;
  targetAudience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  proposedDate?: string; // ISO date
}

interface ProfessionalProfile {
  photoKey?: string;
  cvKey?: string;
  linkedInUrl?: string;
  expertiseArea?: string;
  company?: string;
  jobTitle?: string;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
}

// ========================================
// 🛠️ UTILIDADES
// ========================================
/**
 * Obtiene el nombre real de la tabla DynamoDB con sufijo
 */
async function getTableName(prefix: string): Promise<string> {
  const response = await ddbClient.send(new ListTablesCommand({}));
  const tableName = response.TableNames?.find(name => name.startsWith(prefix));
  
  if (!tableName) {
    throw new Error(`❌ No se encontró tabla con prefijo: ${prefix}`);
  }
  
  return tableName;
}

/**
 * Envía email de aprobación usando SES
 */
async function sendApprovalEmail(email: string, userName: string): Promise<void> {
  const htmlBody = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <link rel="preload" as="image" href="https://images.foor.dev/Logo.png" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <body style="background-color:#ffffff">
    <!--$--><!--html--><!--head--><!--body-->
    <table
      border="0"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      align="center">
      <tbody>
        <tr>
          <td
            style='background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif;position:relative'>
            <div
              style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0"
              data-skip-in-text="true">
              ¡Felicidades! Has sido aprobado como speaker
              <div>
                 ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
              </div>
            </div>
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="max-width:600px;padding-left:12px;padding-right:12px;margin:0 auto;position:relative">
              <tbody>
                <tr style="width:100%">
                  <td>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="padding-top:30px;padding-bottom:30px">
                      <tbody>
                        <tr>
                          <td>
                            <img
                              alt="AWS User Group Puebla"
                              height="192"
                              src="https://images.foor.dev/Logo.png"
                              style="display:block;outline:none;border:none;text-decoration:none;margin:0 auto"
                              width="192" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="overflow:hidden">
                      <tbody>
                        <tr>
                          <td>
                            <table
                              align="center"
                              width="100%"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation"
                              style="padding:20px;padding-bottom:0">
                              <tbody style="width:100%">
                                <tr style="width:100%">
                                  <td data-id="__react-email-column">
                                    <h1
                                      style="color:#333;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;font-size:32px;font-weight:bold;margin:40px 0;padding:0;text-align:center">
                                      🎉 ¡Felicidades
                                      <!-- -->${userName}<!-- -->!
                                    </h1>
                                    <h1
                                      style="color:#333;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;font-size:26px;font-weight:bold;margin:20px 0;padding:0;text-align:center">
                                      ¡Excelentes noticias!
                                    </h1>
                                    <p
                                      style="font-size:16px;line-height:24px;color:#333;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;margin:16px 0;margin-top:16px;margin-right:0;margin-bottom:16px;margin-left:0">
                                      Tu postulación para ser SPEAKER de AWS
                                      User Group Puebla ha sido
                                      <strong>APROBADA</strong>.
                                    </p>
                                    <h2
                                      style="color:#333;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;font-size:20px;font-weight:600;margin:32px 0 16px 0;padding:0">
                                      📋 ¿Qué sigue?
                                    </h2>
                                    <p
                                      style="font-size:16px;line-height:24px;color:#333;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;margin:16px 0;margin-top:16px;margin-right:0;margin-bottom:16px;margin-left:0">
                                      • Ya tienes acceso a funcionalidades
                                      exclusivas de speakers<br />• Puedes
                                      proponer charlas para nuestros próximos
                                      eventos<br />• Tu perfil ahora muestra el
                                      badge de SPEAKER<br />• Pronto nos
                                      pondremos en contacto contigo para
                                      coordinar tu primera charla
                                    </p>
                                    <div
                                      style="text-align:center;margin:40px 0">
                                      <a
                                        href="https://awspuebla.com/profile"
                                        style="line-height:100%;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;background-color:#0b0f4b;border-radius:5px;color:#e7e4e2;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;font-size:16px;font-weight:bold;text-align:center;padding:12px 30px;cursor:pointer;padding-top:12px;padding-right:30px;padding-bottom:12px;padding-left:30px"
                                        target="_blank"
                                        ><span
                                          ><!--[if mso
                                            ]><i
                                              style="mso-font-width:500%;mso-text-raise:18"
                                              hidden
                                              >&#8202;&#8202;&#8202;</i
                                            ><!
                                          [endif]--></span
                                        ><span
                                          style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:9px"
                                          >Ver mi perfil</span
                                        ><span
                                          ><!--[if mso
                                            ]><i
                                              style="mso-font-width:500%"
                                              hidden
                                              >&#8202;&#8202;&#8202;&#8203;</i
                                            ><!
                                          [endif]--></span
                                        ></a
                                      >
                                    </div>
                                    <div
                                      style="padding:8px 8px;margin-bottom:24px;text-align:center">
                                      <a
                                        href="https://www.meetup.com/awspuebla/"
                                        style="color:#666;text-decoration-line:none;text-decoration:none;margin:0 8px"
                                        target="_blank"
                                        ><html dir="ltr" lang="en">
                                          <svg
                                            style="width:20px;height:20px;display:inline-block"
                                            viewBox="0 0 512 512"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill-rule="evenodd"
                                            clip-rule="evenodd"
                                            stroke-linejoin="round"
                                            stroke-miterlimit="2">
                                            <path
                                              d="M103.17 66.372c72.78-29.995 206.275-64.453 300.464-37.674 48.44 13.771 92.41 65.892 100.84 121.418 6.982 46.012-10.863 98.615-35.527 125.234-1.81 1.952-2.772 4.541-2.59 7.197.063.938.28 1.892.618 2.766 34.073 87.607-19.385 129.919-80.296 141.804-62.374 12.171-123.282 33.055-181.862 57.455h-.005l-.003.003c-60.04 25.055-146.057-.792-175.106-65.15-16.422-36.388-4.82-89.32 8.426-126.796 1.611-4.556.688-9.614-2.251-13.45-10.904-14.233-19.474-31.152-24.808-50.232-20.952-74.966 25.624-135.179 92.1-162.575zm214.193 99.404c-17.246-19.067-47.744-22.127-70.836-.76-4.478 4.144-12.685 3.187-16.98-1.148-13.798-13.926-39.054-16.85-60.273-8.336-17.538 7.038-31.625 23.16-40.112 47.901 0 0-15.38 59.215-28.54 95.25-20.83 61.703 70.195 79.477 88.112 21.645l25.832-90.606c4.078-13.142 10.25-24.441 22.646-21.293 12.397 3.15 13.06 15.885 8.18 29.582l-12.089 49.994c-11.055 39.928 45.097 50.708 56.982 14.112l19.386-72.395c3.86-13.917 10.799-22.08 20.842-19.982 10.046 2.098 13.098 10.709 9.128 24.604l-10.684 42.18c-7.022 24.257-.685 44.42 23.76 48.34 26.651 4.273 43.395-6.925 49.102-11.66 1.499-1.236 2.37-3.015 2.692-4.934.64-3.789-2.293-7.192-6.123-7.3-10.095-.274-16.284-1.82-18.52-8.327-1.71-4.974-2.311-10.351.773-21.175 2.678-9.4 9.483-33.842 14.47-51.792 5.567-20.04 13.31-42.922-5.213-58.764-15.55-13.301-39.755-9.482-58.684 6.131-4.033 3.33-10.34 2.615-13.85-1.267zM348.197 499.938c75.614-1.955 96.11-48.22 78.498-51.673-48.036-9.42-249.115 56.089-78.498 51.673zM88.1 12.683C36.057 16.735 19.974 68.258 32.53 68.258c33.333 0 169.341-64.428 55.572-55.575z"
                                              fill="currentColor"
                                              fill-rule="nonzero"></path>
                                          </svg></html></a
                                      ><a
                                        href="https://chat.whatsapp.com/FR64xg90PBEFuQRjROGPxL?fbclid=PAZXh0bgNhZW0CMTEAAaYYOYZCc-uFdoGYdOblm6EPreCHWTKuz9M-J_1L3Kmx4Ie1HOvRCzbDdBc_aem_Pubb18Utgq-GFt_XT6ErIw"
                                        style="color:#666;text-decoration-line:none;text-decoration:none;margin:0 8px"
                                        target="_blank"
                                        ><html dir="ltr" lang="en">
                                          <svg
                                            style="width:20px;height:20px;display:inline-block"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                            aria-hidden="true">
                                            <path
                                              d="M20.52 3.48A11.86 11.86 0 0012.01 0C5.38 0 .04 5.34.04 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.21-1.63a11.92 11.92 0 005.8 1.48h.01c6.63 0 11.98-5.34 11.98-11.97 0-3.2-1.25-6.2-3.48-8.4zm-8.51 18.3a9.9 9.9 0 01-5.04-1.38l-.36-.21-3.69.97.98-3.6-.23-.37a9.9 9.9 0 01-1.52-5.22c0-5.45 4.43-9.88 9.88-9.88a9.82 9.82 0 016.99 2.9 9.83 9.83 0 012.89 6.98c0 5.45-4.43 9.88-9.88 9.88zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.48.71.3 1.26.48 1.69.61.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.08-.12-.27-.2-.57-.35z"></path>
                                          </svg></html></a
                                      ><a
                                        href="https://www.instagram.com/awspuebla"
                                        style="color:#666;text-decoration-line:none;text-decoration:none;margin:0 8px"
                                        target="_blank"
                                        ><html dir="ltr" lang="en">
                                          <svg
                                            style="width:20px;height:20px;display:inline-block"
                                            fill="currentColor"
                                            viewBox="0 0 24 24">
                                            <path
                                              d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path>
                                          </svg></html></a
                                      ><a
                                        href="https://www.linkedin.com/company/awspuebla/"
                                        style="color:#666;text-decoration-line:none;text-decoration:none;margin:0 8px"
                                        target="_blank"
                                        ><html dir="ltr" lang="en">
                                          <svg
                                            style="width:20px;height:20px;display:inline-block"
                                            fill="currentColor"
                                            viewBox="0 0 24 24">
                                            <path
                                              d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path>
                                          </svg></html></a
                                      ><a
                                        href="https://www.youtube.com/@awspuebla"
                                        style="color:#666;text-decoration-line:none;text-decoration:none;margin:0 8px"
                                        target="_blank"
                                        ><html dir="ltr" lang="en">
                                          <svg
                                            style="width:20px;height:20px;display:inline-block"
                                            fill="currentColor"
                                            viewBox="0 0 24 24">
                                            <path
                                              d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>
                                          </svg></html></a
                                      ><a
                                        href="https://github.com/awspuebla"
                                        style="color:#666;text-decoration-line:none;text-decoration:none;margin:0 8px"
                                        target="_blank"
                                        ><html dir="ltr" lang="en">
                                          <svg
                                            style="width:20px;height:20px;display:inline-block"
                                            fill="currentColor"
                                            viewBox="0 0 24 24">
                                            <path
                                              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path>
                                          </svg></html></a
                                      ><a
                                        href="mailto:awspuebla@gmail.com"
                                        style="color:#666;text-decoration-line:none;text-decoration:none;margin:0 8px"
                                        target="_blank"
                                        ><html dir="ltr" lang="en">
                                          <svg
                                            style="width:20px;height:20px;display:inline-block"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor">
                                            <path
                                              stroke-linecap="round"
                                              stroke-linejoin="round"
                                              stroke-width="2"
                                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                          </svg></html
                                      ></a>
                                    </div>
                                    <p
                                      style="font-size:16px;line-height:24px;color:#333;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;margin:16px 0;margin-top:16px;margin-right:0;margin-bottom:16px;margin-left:0">
                                      ¡Bienvenido al equipo de speakers! 🎤
                                    </p>
                                    <p
                                      style="font-size:16px;line-height:24px;color:#333;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;margin:16px 0;margin-top:16px;margin-right:0;margin-bottom:16px;margin-left:0">
                                      Saludos,<br /><strong
                                        >AWS User Group Puebla</strong
                                      ><br /><br />
                                    </p>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="padding:64px 0;position:relative;overflow:hidden">
                      <tbody>
                        <tr>
                          <td>
                            <div
                              style="position:absolute;top:0;left:0;right:0;bottom:0;background-image:url(https://images.foor.dev/pueblabg.png);background-size:cover;background-position:center;background-repeat:no-repeat;opacity:0.2;z-index:1"></div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div class="text-center">
                      <p
                        style="font-size:12px;line-height:24px;color:#000000;font-family:-apple-system, BlinkMacSystemFont, &#x27;Segoe UI&#x27;, &#x27;Roboto&#x27;, &#x27;Oxygen&#x27;, &#x27;Ubuntu&#x27;, &#x27;Cantarell&#x27;, &#x27;Fira Sans&#x27;, &#x27;Droid Sans&#x27;, &#x27;Helvetica Neue&#x27;, sans-serif;text-align:center;margin-top:48px;position:relative;z-index:10;margin-bottom:16px">
                        AWS User Group Puebla | Puebla, México<br />Este es un
                        mensaje automático, por favor no responder.
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <!--/$-->
  </body>
</html>
`;

  const command = new SendEmailCommand({
    Source: SENDER_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: '🎉 ¡Tu postulación como SPEAKER ha sido aprobada!',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `¡Felicidades ${userName}! Tu postulación para ser SPEAKER de AWS User Group Puebla ha sido APROBADA. Ya tienes acceso a funcionalidades exclusivas de speakers. Visita tu perfil en: https://awspuebla.com/profile`,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(command);
  console.log(`✅ Email de aprobación enviado a: ${email}`);
}

// ========================================
// 🎯 HANDLER PRINCIPAL
// ========================================
export const handler: Handler<ManualApprovalEvent> = async (event) => {
  console.log('🎯 Aprobación MANUAL de speaker iniciada:', JSON.stringify(event, null, 2));

  const { applicationId, userId, approvedBy } = event;

  if (!applicationId || !userId) {
    throw new Error('❌ Faltan parámetros requeridos: applicationId, userId');
  }

  if (!USER_POOL_ID) {
    throw new Error('❌ USER_POOL_ID no configurado');
  }

  try {
    // 0️⃣ Obtener nombres reales de las tablas
    const tableName = await getTableName(TABLE_PREFIX);
    const notificationTableName = await getTableName(NOTIFICATION_TABLE_PREFIX);
    const userTableName = await getTableName(USER_TABLE_PREFIX);
    const talkProposalTableName = await getTableName(TALK_PROPOSAL_TABLE_PREFIX);
    console.log(`📋 Usando tablas: ${tableName}, ${notificationTableName}, ${userTableName}, ${talkProposalTableName}`);

    // 1️⃣ Obtener datos de la postulación
    console.log(`📖 Obteniendo postulación: ${applicationId}`);
    const getResult = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { id: applicationId },
    }));

    const application = getResult.Item as SpeakerApplication;

    if (!application) {
      throw new Error(`❌ Postulación no encontrada: ${applicationId}`);
    }

    if (application.status !== 'PENDING') {
      throw new Error(`⚠️ Postulación ya fue procesada. Estado actual: ${application.status}`);
    }

    console.log(`✅ Postulación encontrada para: ${application.email}`);

    // 2️⃣ Actualizar status en DynamoDB
    console.log('📝 Actualizando status a APPROVED...');
    await docClient.send(new UpdateCommand({
      TableName: tableName,
      Key: { id: applicationId },
      UpdateExpression: 'SET #status = :status, reviewedAt = :reviewedAt, approvedBy = :approvedBy',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'APPROVED',
        ':reviewedAt': new Date().toISOString(),
        ':approvedBy': approvedBy,
      },
    }));

    console.log('✅ Status actualizado correctamente');

    // 4️⃣ Agregar usuario al grupo SPEAKERS en Cognito
    console.log(`👥 Agregando usuario ${userId} al grupo SPEAKERS...`);
    await cognitoClient.send(new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
      GroupName: 'SPEAKERS',
    }));

    console.log('✅ Usuario agregado al grupo SPEAKERS');

    // 5️⃣ 🎯 Actualizar role en tabla User a SPEAKER y copiar professionalProfile
    console.log(`📋 Actualizando role y perfil profesional en User table: ${userId}`);
    
    // Preparar los datos del perfil profesional si existen
    const updateExpressions: string[] = ['#role = :role', 'updatedAt = :now'];
    const expressionAttributeNames: Record<string, string> = { '#role': 'role' };
    const expressionAttributeValues: Record<string, unknown> = {
      ':role': 'SPEAKER',
      ':now': new Date().toISOString(),
    };
    
    // Copiar datos del professionalProfile a la tabla User si existen
    if (application.professionalProfile) {
      const profile = application.professionalProfile;
      
      if (profile.photoKey) {
        updateExpressions.push('speakerPhotoKey = :photoKey');
        expressionAttributeValues[':photoKey'] = profile.photoKey;
        console.log(`  ✓ Copiando photoKey: ${profile.photoKey}`);
      }
      
      if (profile.cvKey) {
        updateExpressions.push('speakerCvKey = :cvKey');
        expressionAttributeValues[':cvKey'] = profile.cvKey;
        console.log(`  ✓ Copiando cvKey: ${profile.cvKey}`);
      }
      
      if (profile.linkedInUrl) {
        updateExpressions.push('linkedInUrl = :linkedInUrl');
        expressionAttributeValues[':linkedInUrl'] = profile.linkedInUrl;
        console.log(`  ✓ Copiando linkedInUrl: ${profile.linkedInUrl}`);
      }
      
      if (profile.expertiseArea) {
        updateExpressions.push('expertiseArea = :expertiseArea');
        expressionAttributeValues[':expertiseArea'] = profile.expertiseArea;
        console.log(`  ✓ Copiando expertiseArea: ${profile.expertiseArea}`);
      }
      
      // También copiar company y jobTitle si existen y no están ya en User
      if (profile.company) {
        updateExpressions.push('company = :company');
        expressionAttributeValues[':company'] = profile.company;
        console.log(`  ✓ Copiando company: ${profile.company}`);
      }
      
      if (profile.jobTitle) {
        updateExpressions.push('jobTitle = :jobTitle');
        expressionAttributeValues[':jobTitle'] = profile.jobTitle;
        console.log(`  ✓ Copiando jobTitle: ${profile.jobTitle}`);
      }
    }
    
    await docClient.send(new UpdateCommand({
      TableName: userTableName,
      Key: { id: userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    console.log('✅ Role y perfil profesional actualizados en User table');

    // 6️⃣ Enviar email de aprobación (operación no crítica - no debe fallar el proceso)
    const userName = application.professionalProfile?.givenName 
      ? `${application.professionalProfile.givenName} ${application.professionalProfile.familyName || ''}`.trim()
      : application.email.split('@')[0]; // Fallback si no hay nombre
    try {
      await sendApprovalEmail(application.email, userName);
      console.log('✅ Email de aprobación enviado');
    } catch (emailError) {
      console.error('⚠️ Error enviando email de aprobación (no crítico):', emailError);
      // No lanzar error - la aprobación ya se completó exitosamente
      // El usuario puede verificar su estado en el perfil o recibir notificación in-app
    }

    // 7️⃣ 🆕 Crear TalkProposal automáticamente si tiene propuesta adjunta
    let talkProposalId: string | undefined;
    
    if (application.hasAttachedProposal && application.attachedProposal) {
      try {
        console.log('🎯 Creando TalkProposal automáticamente desde attachedProposal...');
        
        // attachedProposal ya viene como objeto desde DynamoDB DocumentClient, no necesita JSON.parse()
        const attachedProposal = application.attachedProposal;
        talkProposalId = await createTalkProposalFromAttached(
          userId,
          application.email,
          userName,
          attachedProposal,
          application.topics || [],
          talkProposalTableName
        );
        
        console.log(`✅ TalkProposal creada: ${talkProposalId}`);
      } catch (error) {
        console.error('⚠️ Error creando TalkProposal automática:', error);
        // No fallar la aprobación por esto, solo logear
      }
    }

    // 8️⃣ Crear notificación in-app
    await createNotification(userId, notificationTableName, !!application.hasAttachedProposal, talkProposalId);

    console.log('✅ Notificación in-app creada');

    // ========================================
    // 🎉 ÉXITO
    // ========================================
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Speaker aprobado manualmente exitosamente',
        applicationId,
        userId,
        status: 'APPROVED',
        approvedBy,
        talkProposalCreated: !!talkProposalId,
        talkProposalId: talkProposalId || null,
      }),
    };

  } catch (error) {
    console.error('❌ Error en aprobación manual:', error);
    throw error;
  }
};
