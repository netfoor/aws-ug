# 🧹 Gestión de Recursos Huérfanos en AWS

## 📊 Análisis de Recursos que Requieren Limpieza

### ✅ 1. Event Source Mappings (DynamoDB Streams)

**Estado**: ❌ **Actualmente se crean manualmente**  
**Huérfanos encontrados**: 6 mappings

#### Problema:
Los mappings se crean con `aws lambda create-event-source-mapping` en `post-deploy-setup.ps1`. Si la Lambda se borra/recrea, los mappings quedan huérfanos referenciando funciones inexistentes.

#### Solución CDK (BLOQUEADA):
```typescript
// ❌ NO FUNCIONA en Amplify Gen 2 actual
const speakerApplicationTable = backend.data.resources.tables['SpeakerApplication'];
backend.processSpeakerApplication.resources.lambda.addEventSource(
  new DynamoEventSource(speakerApplicationTable, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 10,
  })
);
```

**Razón del bloqueo**: Amplify Gen 2 no expone `backend.data.resources.tables` como objetos CDK individuales. Las tablas se generan dinámicamente pero no son accesibles programáticamente.

#### Solución Actual:
- **Configuración manual** una sola vez con `post-deploy-setup.ps1`
- **Limpieza automática**: Los mappings SÍ se borran cuando se elimina la Lambda o la tabla (vinculación de CloudFormation)
- **Detección de huérfanos**: Script `cleanup-orphaned-resources-fixed.ps1` detecta mappings con estado "Function not found"

#### Roadmap:
- [ ] Solicitar a AWS Amplify que exponga `tables` en `backend.data.resources`
- [ ] Migrar a `DynamoEventSource` cuando esté disponible
- [ ] Mientras tanto, mantener script de limpieza manual

---

### ⚠️ 2. EventBridge Schedules

**Estado**: ✅ **Parcialmente gestionados**  
**Huérfanos encontrados**: 8 schedules (>10 min de antigüedad)

#### Problema:
Los schedules `approve-speaker-{uuid}` se crean dinámicamente cuando llega una postulación. Si la aplicación se aprueba/rechaza manualmente ANTES de que expire el schedule, este queda huérfano.

#### Solución Implementada:
```typescript
// ✅ Las Lambdas manual-approve y reject SÍ cancelan schedules
await schedulerClient.send(new DeleteScheduleCommand({
  Name: `approve-speaker-${applicationId}`
}));
```

#### Casos Edge que generan huérfanos:
1. **Lambda de aprobación automática falla** → Schedule se ejecutó pero falló
2. **Schedule con formato incorrecto** → No se puede parsear ni ejecutar
3. **Borrado manual de aplicación** → Schedule no se cancela

#### Solución CDK (Posible pero innecesario):
```typescript
// Custom Resource para limpieza periódica
const cleanupSchedules = new NodejsFunction(stack, 'CleanupSchedules', {
  entry: 'functions/cleanup-schedules/handler.ts',
  timeout: Duration.minutes(5),
});

new Rule(stack, 'CleanupSchedulesRule', {
  schedule: Schedule.rate(Duration.hours(1)),
  targets: [new LambdaFunction(cleanupSchedules)],
});
```

**Decisión**: ❌ **NO implementar Lambda de limpieza automática**
- Los schedules huérfanos son raros (<1% de casos)
- Agregar Lambda implica más costo y complejidad
- Script manual 1x/mes es suficiente

#### Acción:
- Mantener `cleanup-orphaned-resources-fixed.ps1` para limpieza periódica
- Ejecutar cada mes o cuando se acumulen >20 schedules

---

### ✅ 3. CloudWatch Log Groups

**Estado**: ✅ **IMPLEMENTADO - Retention automática via CDK**  
**Huérfanos encontrados anteriormente**: 122 log groups sin límite de retención

#### Problema:
Los logs de Lambdas se guardan indefinidamente por defecto. Esto genera costos innecesarios ($0.50/GB/mes).

#### Solución CDK (IMPLEMENTADA):
```typescript
import { AwsCustomResource, AwsCustomResourcePolicy } from 'aws-cdk-lib/custom-resources';

// Custom Resource que configura retention para cada Lambda
new AwsCustomResource(lambda.stack, `${name}LogRetention`, {
  onCreate: {
    service: 'CloudWatchLogs',
    action: 'putRetentionPolicy',
    parameters: {
      logGroupName: `/aws/lambda/${lambda.functionName}`,
      retentionInDays: 7,
    },
  },
  policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
});
```

**Resultado**: ✅ Todos los logs de Lambda ahora tienen retention de 7 días automáticamente. Ya no requiere script de limpieza manual.

#### Solución Actual:
```powershell
# Script: cleanup-orphaned-resources-fixed.ps1 (sección 4)
aws logs put-retention-policy --log-group-name /aws/lambda/amplify-awsug-* --retention-in-days 7
```

**Ventaja**: Una vez aplicado, CloudWatch mantiene la policy automáticamente.

#### Solución CDK (Custom Resource):
```typescript
// Custom Resource que aplica retention a todos los log groups
const applyLogRetention = new Provider(stack, 'LogRetentionProvider', {
  onEventHandler: new NodejsFunction(stack, 'ApplyRetention', {
    entry: 'functions/apply-log-retention/handler.ts',
    initialPolicy: [
      new PolicyStatement({
        actions: ['logs:PutRetentionPolicy', 'logs:DescribeLogGroups'],
        resources: ['*'],
      }),
    ],
  }),
});

new CustomResource(stack, 'AllLogRetention', {
  serviceToken: applyLogRetention.serviceToken,
  properties: {
    LogGroupPrefix: '/aws/lambda/amplify-awsug',
    RetentionDays: 7,
  },
});
```

**Decisión**: ⚠️ **Evaluando Custom Resource**
- Pros: Automático en cada deploy
- Cons: Complejidad adicional, otra Lambda
- **Recomendación**: Ejecutar script una vez, CloudWatch mantiene la policy

#### Acción:
- Ejecutar `cleanup-orphaned-resources-fixed.ps1` **una vez**
- La retention se mantiene automáticamente después
- Opcional: Implementar Custom Resource si queremos 100% IaC

---

### ❌ 4. Registros de Testing en DynamoDB

**Estado**: ✅ **No automatizable (por diseño)**  
**Registros de prueba**: Depende del uso

#### Problema:
Durante desarrollo se crean registros con `email: "test@..."` o `motivation: "test..."` que contaminan producción.

#### ¿Por qué NO automatizar?
1. **Riesgo de borrar datos reales**: Un patrón `contains(email, 'test')` podría borrar `contest@company.com`
2. **Separación de ambientes**: El problema real es mezclar dev/prod
3. **No es problema de infraestructura**: Es problema de workflow

#### Solución Correcta:
```bash
# Usar Amplify Branches para separar ambientes
amplify env checkout dev    # Base de datos separada
amplify env checkout prod   # Base de datos de producción
```

#### Acción:
- Mantener limpieza manual con confirmación explícita
- **Nunca** automatizar borrado de datos por patrones
- Evaluar migrar a múltiples ambientes (dev/staging/prod)

---

## 📋 Resumen de Automatización

| Recurso | Automatizable CDK | Estado Actual | Decisión |
|---------|-------------------|---------------|----------|
| Event Source Mappings | ❌ Bloqueado por Amplify | Manual + cleanup script | Mantener manual hasta que Amplify lo soporte |
| EventBridge Schedules | ✅ Posible (Custom Resource) | Cancelación en Lambdas + script | **NO implementar**, script 1x/mes es suficiente |
| CloudWatch Logs | ⚠️ Posible (Custom Resource) | Script aplica retention | **Script 1x** (retention se mantiene) |
| DynamoDB Testing Data | ❌ No recomendado | Script manual con confirmación | **Mantener manual** (seguridad) |

---

## 🛠️ Scripts de Limpieza

### Script Principal
**Archivo**: `scripts/cleanup-orphaned-resources-fixed.ps1`

**Uso**:
```powershell
# Ejecutar limpieza completa
.\scripts\cleanup-orphaned-resources-fixed.ps1

# Secciones:
# 1. Event Source Mappings → Automático (detecta y elimina rotos)
# 2. EventBridge Schedules → Automático (elimina >10 min)
# 3. DynamoDB Records → Manual (requiere confirmación)
# 4. CloudWatch Logs → Manual (requiere confirmación, 1 sola vez)
```

**Frecuencia recomendada**:
- **Event Source Mappings**: Cada deploy fallido (automático)
- **EventBridge Schedules**: 1x/mes o cuando >20 schedules
- **CloudWatch Logs**: **1 sola vez** (retention se mantiene)
- **DynamoDB Testing**: Según necesidad (pre-producción)

---

## 🚀 Mejoras Futuras

### Corto Plazo (1-2 semanas):
- [ ] Ejecutar script de logs **una sola vez** en producción
- [ ] Documentar proceso de limpieza en README.md
- [ ] Agregar GitHub Action para ejecutar cleanup mensualmente

### Mediano Plazo (1-2 meses):
- [ ] Evaluar Custom Resource para log retention
- [ ] Separar ambientes dev/staging/prod con Amplify Branches
- [ ] Monitorear costos de CloudWatch Logs

### Largo Plazo (cuando Amplify lo soporte):
- [ ] Migrar Event Source Mappings a CDK cuando Amplify exponga tablas
- [ ] Evaluar si Custom Resource para schedules es necesario
- [ ] Consolidar toda la infraestructura en CDK (100% IaC)

---

## 💰 Impacto en Costos

### Antes de limpieza:
- **122 log groups** sin retention → ~$15-30/mes (estimado)
- **6 mappings huérfanos** → Intentos fallidos de polling → ~$0.50/mes
- **8 schedules** intentando invocar Lambdas inexistentes → ~$0.10/mes

### Después de limpieza:
- **Log retention 7 días** → Logs rotan automáticamente → ~$2-5/mes
- **0 mappings huérfanos** → Sin intentos fallidos
- **Schedules limpios** → Solo schedules activos

**Ahorro estimado**: $10-25/mes (~$120-300/año)

---

## 📚 Referencias

- [Amplify Gen 2 - Data Resources](https://docs.amplify.aws/react/build-a-backend/data/)
- [CDK - DynamoDB Event Sources](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_event_sources.DynamoEventSource.html)
- [CloudWatch Logs Retention](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html#SettingLogRetention)
- [EventBridge Scheduler Pricing](https://aws.amazon.com/eventbridge/pricing/)

---

## ✅ Checklist de Implementación

- [x] Analizar recursos huérfanos existentes
- [x] Documentar limitaciones de Amplify Gen 2
- [x] Evaluar soluciones CDK vs scripts
- [x] Decidir qué automatizar y qué mantener manual
- [ ] Ejecutar cleanup de logs (1 sola vez)
- [ ] Ejecutar cleanup de schedules (periódico)
- [ ] Configurar GitHub Action para limpieza mensual
- [ ] Monitorear costos post-limpieza

---

**Última actualización**: 28 de noviembre, 2025  
**Versión**: 1.0  
**Autor**: AWS Puebla Connect Team
