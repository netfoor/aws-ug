# 🎤 Speaker Application Workflow - Setup Guide

## ✅ Estado del IaC (Infrastructure as Code)

### 100% IaC (Se limpia automáticamente con `npx ampx sandbox delete`):
- ✅ Lambda `process-speaker-application`
- ✅ Lambda `approve-speaker-application`
- ✅ IAM Policies para ambas Lambdas
- ✅ IAM Role para EventBridge Scheduler
- ✅ DynamoDB tabla `SpeakerApplication`
- ✅ Cognito User Pool y grupos
- ✅ Variables de entorno

### ⚠️ Configuración Manual (UNA SOLA VEZ, no se repite):
- DynamoDB Stream Trigger (limitación de Amplify Gen 2)

---

## 🚀 Deployment

### 1. Deploy completo del backend
```powershell
npx ampx sandbox
```

Espera a que termine (5-10 minutos). Verás:
```
✔ Deployment completed
AppSync API endpoint = https://...
```

### 2. Habilitar DynamoDB Streams (Automático en Amplify)

Amplify **debería** habilitar streams automáticamente, pero verifiquemos:

```powershell
# Obtener nombre de la tabla
$TABLE_NAME = aws dynamodb list-tables --query "TableNames[?contains(@, 'SpeakerApplication')]" --output text

# Verificar si streams están habilitados
aws dynamodb describe-table --table-name $TABLE_NAME --query "Table.StreamSpecification"
```

Si el output es `null` o `StreamEnabled: false`, habilítalo:

```powershell
aws dynamodb update-table `
  --table-name $TABLE_NAME `
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES
```

### 3. Conectar DynamoDB Stream a Lambda

Esta es la **ÚNICA configuración manual** necesaria:

```powershell
# Obtener Lambda ARN
$LAMBDA_ARN = aws lambda list-functions --query "Functions[?contains(FunctionName, 'process-speaker-application')].FunctionArn" --output text

# Obtener Stream ARN
$STREAM_ARN = aws dynamodb describe-table --table-name $TABLE_NAME --query "Table.LatestStreamArn" --output text

# Crear el Event Source Mapping (UNA SOLA VEZ)
aws lambda create-event-source-mapping `
  --function-name $LAMBDA_ARN `
  --event-source-arn $STREAM_ARN `
  --starting-position LATEST `
  --batch-size 10
```

**IMPORTANTE**: Este mapping está **vinculado** a la Lambda y la tabla. Cuando hagas `npx ampx sandbox delete`, AWS borra automáticamente el mapping también. **NO queda huérfano**.

### 4. Configurar SES (Amazon Simple Email Service)

Amplify NO puede configurar SES automáticamente (limitación de AWS).

#### Opción A: Sandbox Mode (Para testing)
```powershell
# Verificar tu email personal
aws ses verify-email-identity --email-address tu-email@gmail.com
```

Recibirás un email de AWS. Haz click en el link. Luego podrás enviar emails **solo a ese email** (perfecto para testing).

#### Opción B: Producción (Cuando vayas a producción)
1. Verificar dominio `awspuebla.com`
2. Salir de sandbox mode
3. Configurar DKIM/SPF records

---

## 🧪 Testing

### 1. Crear una postulación de prueba

Usa GraphQL en AppSync Console o Postman:

```graphql
mutation CreateSpeakerApplication {
  createSpeakerApplication(input: {
    userId: "google_102417110559256792690"
    email: "tu-email@gmail.com"
    motivation: "Quiero compartir mi conocimiento sobre AWS Lambda"
    topics: ["Lambda", "Serverless", "EventBridge"]
    experience: "2 años trabajando con AWS"
    previousTalksLinks: ["https://youtube.com/mi-charla"]
    status: PENDING
    submittedAt: "2025-11-24T12:00:00Z"
  }) {
    id
    status
    submittedAt
  }
}
```

### 2. Verificar CloudWatch Logs

```powershell
# Logs de Lambda de procesamiento
aws logs tail /aws/lambda/amplify-awsug-*-process-speaker-application* --follow

# Logs de Lambda de aprobación (después de 5 min)
aws logs tail /aws/lambda/amplify-awsug-*-approve-speaker-application* --follow
```

### 3. Verificar emails

Deberías recibir:
1. **Inmediato**: "Tu postulación ha sido recibida"
2. **5 minutos después**: "¡Tu postulación ha sido aprobada!"

### 4. Verificar grupo en Cognito

```powershell
aws cognito-idp admin-list-groups-for-user `
  --user-pool-id us-east-1_CFlWpHKxh `
  --username google_102417110559256792690
```

Deberías ver el grupo `SPEAKERS`.

---

## 🧹 Limpieza

```powershell
npx ampx sandbox delete
```

Esto borra **TODOS** los recursos:
- ✅ Lambdas
- ✅ DynamoDB tabla
- ✅ IAM Roles y Policies
- ✅ EventBridge Scheduler role
- ✅ **Event Source Mapping** (vinculado a Lambda, se borra automáticamente)
- ✅ Cognito User Pool

**NO quedan recursos huérfanos** ✨

---

## 📝 ¿Por qué el Stream Trigger es manual?

**Limitación de Amplify Gen 2**:
- `defineData()` no expone las tablas individuales como objetos CDK
- No podemos hacer `new DynamoEventSource(table.stream)` porque no tenemos acceso al objeto `table`
- Amplify genera las tablas dinámicamente en tiempo de deploy

**¿Es un problema?**
- ❌ NO, porque el mapping está **vinculado** a la Lambda y la tabla
- ✅ AWS limpia automáticamente mappings huérfanos cuando borras recursos
- ✅ Solo necesitas configurarlo UNA VEZ después del primer deploy
- ✅ En deploys futuros, el mapping persiste automáticamente

**Alternativa futura**: Cuando Amplify Gen 2 agregue soporte para streams en `defineData`, migraremos a código puro.

---

## 🎯 Resumen

| Componente | Estado | Se limpia con delete |
|------------|--------|---------------------|
| Lambdas | ✅ IaC | ✅ Sí |
| IAM Policies | ✅ IaC | ✅ Sí |
| Scheduler Role | ✅ IaC (CDK) | ✅ Sí |
| DynamoDB Tabla | ✅ IaC | ✅ Sí |
| Stream Trigger | ⚠️ Manual (una vez) | ✅ Sí (vinculado) |
| SES Verification | ⚠️ Manual (AWS policy) | ❌ Persiste |

**Conclusión**: 99% IaC, 1% configuración manual inevitable (SES).
