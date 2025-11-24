# 🎤 Speaker Application System - Post-Deploy Setup

Sistema automatizado de postulación para speakers con workflow de aprobación automática.

## 📋 Prerequisitos

- ✅ Backend desplegado con `npx ampx sandbox`
- ✅ AWS CLI configurado
- ✅ PowerShell (Windows) o Bash (Linux/Mac)

## 🚀 Configuración Rápida (Automática)

Ejecuta el script maestro que configura todo en orden:

```powershell
cd scripts
.\post-deploy-setup.ps1
```

Este script ejecutará automáticamente:
1. Obtener ARNs y nombres de recursos
2. Habilitar DynamoDB Stream
3. Conectar Stream a Lambda
4. Crear IAM Role para EventBridge Scheduler
5. Configurar Amazon SES

## 🔧 Configuración Manual (Paso a Paso)

### Paso 1: Obtener Recursos del Backend

```powershell
.\get-backend-resources.ps1
```

Esto mostrará:
- User Pool ID
- Lambda ARNs (process, approve, postAuth)
- DynamoDB table names
- Stream ARNs
- SES identities

**📝 Copia los siguientes valores:**
- `SpeakerApplication` table name
- `process-speaker-application` Lambda name
- `approve-speaker-application` Lambda ARN
- Stream ARN (si está habilitado)

---

### Paso 2: Habilitar DynamoDB Stream

```powershell
.\enable-dynamodb-stream.ps1 -TableName "SpeakerApplication-xxxxx-SANDBOX"
```

Esto:
- Habilitará Stream con `NEW_AND_OLD_IMAGES`
- Esperará 30 segundos para que esté listo
- Guardará el Stream ARN en `temp-stream-arn.txt`

---

### Paso 3: Conectar Stream a Lambda

```powershell
.\setup-stream-trigger.ps1 `
    -StreamArn "arn:aws:dynamodb:us-east-1:xxxxx:table/SpeakerApplication-xxxxx/stream/2024-11-24T18:00:00.000" `
    -LambdaFunctionName "amplify-awsug-netfoor-san-processspeakerapplicati-xxxxx"
```

Configuración del trigger:
- `starting-position`: LATEST (solo nuevos registros)
- `batch-size`: 10 registros
- `batching-window`: 5 segundos

**⏳ Estado inicial:** `Enabling` (toma 1-2 minutos)

Para verificar el estado:
```powershell
aws lambda list-event-source-mappings --function-name <LAMBDA_NAME>
```

---

### Paso 4: Crear IAM Role para EventBridge Scheduler

```powershell
.\create-scheduler-role.ps1 `
    -ApproveLambdaArn "arn:aws:lambda:us-east-1:xxxxx:function:amplify-awsug-netfoor-san-approvespeakerapplicatio-xxxxx"
```

Esto crea:
- **Role:** `EventBridgeSchedulerToLambdaRole`
- **Policy:** Permite `lambda:InvokeFunction` en la Lambda de aprobación
- **Trust Policy:** Permite que `scheduler.amazonaws.com` asuma el role

**📝 IMPORTANTE:** Copia el `Role ARN` que se muestra al final.

---

### Paso 5: Actualizar Variables de Entorno

Edita `amplify/backend.ts` y agrega el Scheduler Role ARN:

```typescript
backend.processSpeakerApplication.addEnvironment(
  'SCHEDULER_ROLE_ARN',
  'arn:aws:iam::xxxxx:role/EventBridgeSchedulerToLambdaRole' // ← ARN del paso 4
);
```

También actualiza el email del sender:

```typescript
backend.processSpeakerApplication.addEnvironment(
  'SENDER_EMAIL',
  'tu-email-verificado@dominio.com' // ← Email verificado en SES
);

backend.approveSpeakerApplication.addEnvironment(
  'SENDER_EMAIL',
  'tu-email-verificado@dominio.com' // ← Mismo email
);
```

**Re-deploy después de estos cambios:**
```powershell
npx ampx sandbox
```

---

### Paso 6: Configurar Amazon SES

```powershell
.\setup-ses.ps1
```

**Opciones:**

#### A. Verificar Email Individual (Recomendado para testing)
1. Script te pedirá un email
2. AWS enviará email de verificación
3. Click en el link de verificación
4. Confirma en el script

#### B. Usar SES Sandbox (Sin verificación)
Para testing rápido, usa:
- `success@simulator.amazonses.com` (simula envío exitoso)
- Los emails NO llegarán realmente, pero el flujo funcionará

#### C. Salir del Sandbox (Producción)
1. Ve a: https://console.aws.amazon.com/ses
2. Click en "Request production access"
3. Completa el formulario
4. Espera aprobación (~24 horas)

---

## ✅ Verificación de Configuración

Verifica que todo esté configurado correctamente:

### 1. DynamoDB Stream
```powershell
aws dynamodb describe-table --table-name <TABLE_NAME> | ConvertFrom-Json | Select-Object -ExpandProperty Table | Select-Object -ExpandProperty StreamSpecification
```

Debe mostrar:
```
StreamEnabled  : True
StreamViewType : NEW_AND_OLD_IMAGES
```

### 2. Lambda Event Source Mapping
```powershell
aws lambda list-event-source-mappings --function-name <PROCESS_LAMBDA_NAME>
```

Debe mostrar:
```
State         : Enabled
EventSourceArn: arn:aws:dynamodb:...
BatchSize     : 10
```

### 3. IAM Role para Scheduler
```powershell
aws iam get-role --role-name EventBridgeSchedulerToLambdaRole
```

### 4. SES Identities
```powershell
aws sesv2 list-email-identities
```

---

## 🧪 Testing del Flujo Completo

### Opción 1: Test Automático con Script

```powershell
.\test-speaker-flow.ps1 -UserEmail "tu-email@dominio.com" -UserId "test-user-123"
```

Este script:
1. Crea una SpeakerApplication de prueba en DynamoDB
2. Muestra comandos para monitorear cada paso
3. Te guía para verificar el flujo completo

### Opción 2: Test Manual con AWS CLI

#### Paso 1: Crear SpeakerApplication

```powershell
$applicationId = [guid]::NewGuid().ToString()

aws dynamodb put-item --table-name <TABLE_NAME> --item '{
  "id": {"S": "'$applicationId'"},
  "userId": {"S": "test-user-123"},
  "email": {"S": "tu-email@dominio.com"},
  "motivation": {"S": "Quiero ser speaker!"},
  "topics": {"L": [{"S": "AWS Lambda"}, {"S": "Serverless"}]},
  "status": {"S": "PENDING"},
  "submittedAt": {"S": "'$(Get-Date -Format o)'"}
}'
```

#### Paso 2: Monitorear Lambda de Procesamiento

```powershell
aws logs tail /aws/lambda/<PROCESS_LAMBDA_NAME> --since 1m --follow
```

Debes ver:
```
📧 Enviando email de confirmación a: tu-email@dominio.com
✅ Email de confirmación enviado correctamente
⏰ Programando auto-aprobación para: <applicationId>
✅ Schedule creado: arn:aws:scheduler:...
```

#### Paso 3: Verificar Email "Solicitud Recibida"

Revisa tu inbox. Debes recibir email con:
- Asunto: "✅ Tu postulación como Speaker ha sido recibida"
- Contenido HTML con branding AWS Puebla

#### Paso 4: Verificar EventBridge Schedule

```powershell
aws scheduler list-schedules --name-prefix approve-speaker
```

Debe mostrar un schedule con:
- State: `ENABLED`
- Target: ARN de approve Lambda
- ScheduleExpression: `at(2024-11-24T18:35:00)` (aprox 5 min en el futuro)

#### Paso 5: Esperar 5 Minutos ⏰

Toma un café ☕

#### Paso 6: Monitorear Lambda de Aprobación

```powershell
aws logs tail /aws/lambda/<APPROVE_LAMBDA_NAME> --since 1m --follow
```

Debes ver:
```
🎉 Approve Speaker Application Lambda iniciada
📖 Obteniendo aplicación: <applicationId>
📝 Actualizando estado a APPROVED
✅ Estado actualizado en DynamoDB
👤 Agregando usuario test-user-123 al grupo SPEAKERS
✅ Usuario agregado al grupo SPEAKERS
📧 Enviando email de aprobación a: tu-email@dominio.com
✅ Email de aprobación enviado correctamente
```

#### Paso 7: Verificar Email "¡Aprobado!"

Revisa tu inbox. Debes recibir segundo email con:
- Asunto: "🎉 ¡Tu postulación como Speaker ha sido aprobada!"
- Contenido HTML con badge SPEAKER

#### Paso 8: Verificar Usuario en Cognito

```powershell
aws cognito-idp admin-list-groups-for-user `
  --user-pool-id <USER_POOL_ID> `
  --username test-user-123
```

Debe mostrar grupo `SPEAKERS`.

#### Paso 9: Verificar Estado en DynamoDB

```powershell
aws dynamodb get-item `
  --table-name <TABLE_NAME> `
  --key '{"id":{"S":"'$applicationId'"}}'
```

Debe mostrar:
```json
{
  "status": { "S": "APPROVED" },
  "reviewedAt": { "S": "2024-11-24T18:35:00.000Z" }
}
```

---

## 🐛 Troubleshooting

### Error: "AccessDeniedException" en Lambda

**Causa:** Permisos IAM incorrectos.

**Solución:**
1. Verifica que `backend.ts` tenga todos los `addToRolePolicy`
2. Re-deploy: `npx ampx sandbox`
3. Espera a que termine el deploy completo

### Error: "Stream trigger not firing"

**Causa:** Stream no configurado o mapping deshabilitado.

**Solución:**
```powershell
# Verificar que Stream esté habilitado
aws dynamodb describe-table --table-name <TABLE_NAME>

# Verificar event source mapping
aws lambda list-event-source-mappings --function-name <LAMBDA_NAME>

# Si State = "Disabled", habilitar:
aws lambda update-event-source-mapping `
  --uuid <MAPPING_UUID> `
  --enabled
```

### Error: "Email not received"

**Causa:** SES en sandbox mode o email no verificado.

**Solución:**
1. Verifica que el email esté verificado en SES
2. O usa `success@simulator.amazonses.com` para testing
3. Verifica CloudWatch Logs para errores de SES

### Error: "Scheduler cannot invoke Lambda"

**Causa:** Role ARN no configurado o incorrecto.

**Solución:**
1. Verifica que `SCHEDULER_ROLE_ARN` esté en env vars de process Lambda
2. Verifica que el role tenga permisos `lambda:InvokeFunction`
3. Re-deploy después de agregar env var

### Error: "Application not approved after 5 minutes"

**Causa:** Schedule no se creó o falló la invocación.

**Solución:**
```powershell
# Verificar schedules
aws scheduler list-schedules --name-prefix approve-speaker

# Ver schedule específico
aws scheduler get-schedule --name approve-speaker-<ID>

# Ver logs de approve Lambda
aws logs tail /aws/lambda/<APPROVE_LAMBDA_NAME> --since 10m
```

---

## 📊 Monitoreo en Producción

### CloudWatch Logs Insights

Query para ver todas las aplicaciones procesadas:

```sql
fields @timestamp, @message
| filter @message like /Procesando aplicación/
| sort @timestamp desc
| limit 50
```

Query para ver errores:

```sql
fields @timestamp, @message
| filter @message like /❌/
| sort @timestamp desc
```

### CloudWatch Alarms

Configura alarms para:
1. Lambda errors > 5 en 5 minutos
2. SES bounce rate > 5%
3. DynamoDB throttling

---

## 📝 Próximos Pasos

Una vez que el backend funcione:

1. **Crear UI del formulario** (Frontend)
   - Componente React en perfil
   - GraphQL mutation
   - Loading states

2. **Testing E2E**
   - Cypress/Playwright
   - Test completo del flujo

3. **Mejoras opcionales**
   - Aprobación manual por admin
   - Rejection flow con razón
   - Notificaciones en app

---

## 🆘 Ayuda

Si tienes problemas:
1. Revisa CloudWatch Logs
2. Verifica permisos IAM
3. Consulta la documentación de Amplify Gen 2
4. Abre un issue en el repo

---

## ✅ Checklist Final

- [ ] Sandbox desplegado exitosamente
- [ ] DynamoDB Stream habilitado
- [ ] Stream trigger conectado a Lambda
- [ ] IAM Role para Scheduler creado
- [ ] SCHEDULER_ROLE_ARN agregado a env vars
- [ ] Email verificado en SES
- [ ] SENDER_EMAIL actualizado en backend.ts
- [ ] Backend re-desplegado
- [ ] Test manual exitoso
- [ ] Emails recibidos (ambos)
- [ ] Usuario en grupo SPEAKERS
- [ ] Estado APPROVED en DynamoDB

🎉 **¡Listo para integrar el frontend!**
