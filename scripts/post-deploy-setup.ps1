# Post-Deploy Setup - Speaker Workflow
# Configuracion UNICA del DynamoDB Stream trigger
# Ejecutar DESPUES de que npx ampx sandbox termine de desplegar

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  AWS PUEBLA - CONFIGURACION STREAM TRIGGER" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "La infraestructura (IaC) ya esta configurada automaticamente" -ForegroundColor Green
Write-Host "Solo necesitas conectar el Stream trigger (una sola vez)" -ForegroundColor Yellow
Write-Host ""

# ========================================
# 1. BUSCAR TABLA SPEAKERAPPLICATION
# ========================================

Write-Host "Buscando tabla SpeakerApplication..." -ForegroundColor Cyan
$tables = aws dynamodb list-tables --output json | ConvertFrom-Json
$tableName = $tables.TableNames | Where-Object { $_ -like '*SpeakerApplication*' } | Select-Object -First 1

if (-not $tableName) {
    Write-Host "No se encontro la tabla SpeakerApplication" -ForegroundColor Red
    Write-Host "Ya desplegaste con 'npx ampx sandbox'?" -ForegroundColor Yellow
    exit 1
}

Write-Host "Tabla encontrada: $tableName" -ForegroundColor Green

# ========================================
# 2. VERIFICAR Y HABILITAR STREAMS
# ========================================

Write-Host ""
Write-Host "Verificando DynamoDB Streams..." -ForegroundColor Cyan
$tableInfo = aws dynamodb describe-table --table-name $tableName --output json | ConvertFrom-Json
$streamEnabled = $tableInfo.Table.StreamSpecification.StreamEnabled

if ($streamEnabled -eq $true) {
    Write-Host "Streams ya estan habilitados" -ForegroundColor Green
} else {
    Write-Host "Habilitando streams..." -ForegroundColor Yellow
    aws dynamodb update-table `
        --table-name $tableName `
        --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES | Out-Null
    
    # Esperar a que se actualice
    Start-Sleep -Seconds 3
    $tableInfo = aws dynamodb describe-table --table-name $tableName --output json | ConvertFrom-Json
    Write-Host "Streams habilitados" -ForegroundColor Green
}

# Obtener Stream ARN
$streamArn = $tableInfo.Table.LatestStreamArn

# ========================================
# 3. VERIFICAR LAMBDAS ACTIVAS (SIN LEGACY)
# ========================================

Write-Host ""
Write-Host "Verificando Lambdas activas (flujo simplificado)..." -ForegroundColor Cyan
$functions = aws lambda list-functions --output json | ConvertFrom-Json
$manualLambda = $functions.Functions | Where-Object { $_.FunctionName -like '*manual-approve-speaker*' } | Select-Object -First 1

if (-not $lambda) {
    Write-Host "No se encontro la Lambda" -ForegroundColor Red
    exit 1
}

$lambdaArn = $lambda.FunctionArn
Write-Host "Lambda encontrada: $($lambda.FunctionName)" -ForegroundColor Green

# ========================================
# 4. CREAR O VERIFICAR EVENT SOURCE MAPPING
# ========================================

Write-Host ""
Write-Host "Verificando Event Source Mapping existente..." -ForegroundColor Cyan
$mappings = aws lambda list-event-source-mappings --function-name $lambdaArn --output json | ConvertFrom-Json
$existingMapping = $mappings.EventSourceMappings | Where-Object { $_.EventSourceArn -eq $streamArn } | Select-Object -First 1

if ($existingMapping) {
    Write-Host "Event Source Mapping ya existe (UUID: $($existingMapping.UUID))" -ForegroundColor Green
    Write-Host "No es necesario crear uno nuevo" -ForegroundColor Gray
} else {
    Write-Host "Creando Event Source Mapping..." -ForegroundColor Yellow
    
    $result = aws lambda create-event-source-mapping `
        --function-name $lambdaArn `
        --event-source-arn $streamArn `
        --starting-position LATEST `
        --batch-size 10 `
        --maximum-batching-window-in-seconds 1 `
        --output json | ConvertFrom-Json
    
    if ($result.UUID) {
        Write-Host "Event Source Mapping creado exitosamente (UUID: $($result.UUID))" -ForegroundColor Green
    } else {
        Write-Host "Error creando mapping" -ForegroundColor Red
        exit 1
    }
}

# ========================================
# RESUMEN
# ========================================

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  CONFIGURACION COMPLETADA" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "  - Tabla: $tableName" -ForegroundColor Gray
Write-Host "  - Lambda: $($lambda.FunctionName)" -ForegroundColor Gray
Write-Host "  - Stream: Conectado" -ForegroundColor Gray
Write-Host "  - CloudWatch Logs: Retention automatica (7 dias)" -ForegroundColor Gray
Write-Host ""
Write-Host "Nota: CloudWatch Log Retention ahora se gestiona automaticamente via CDK" -ForegroundColor Yellow
Write-Host "Ya no es necesario configurarlo manualmente" -ForegroundColor Gray
Write-Host ""
Write-Host "Siguiente paso: Configurar SES para envio de emails" -ForegroundColor Yellow
Write-Host "Ejecuta: .\scripts\setup-ses.ps1" -ForegroundColor Gray
Write-Host ""
