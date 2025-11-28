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

# Obtener nombre de la tabla SpeakerApplication
Write-Host "Buscando tabla SpeakerApplication..." -ForegroundColor Cyan
$tableName = aws dynamodb list-tables --query "TableNames[?contains(@, 'SpeakerApplication')]" --output text

if (-not $tableName) {
    Write-Host "No se encontro la tabla SpeakerApplication" -ForegroundColor Red
    Write-Host "Ya desplegaste con 'npx ampx sandbox'?" -ForegroundColor Yellow
    exit 1
}

Write-Host "Tabla encontrada: $tableName" -ForegroundColor Green

# Verificar si streams están habilitados
Write-Host ""
Write-Host "Verificando DynamoDB Streams..." -ForegroundColor Cyan
$streamEnabled = aws dynamodb describe-table --table-name $tableName --query "Table.StreamSpecification.StreamEnabled" --output text

if ($streamEnabled -eq "True") {
    Write-Host "Streams ya estan habilitados" -ForegroundColor Green
} else {
    Write-Host "Habilitando streams..." -ForegroundColor Yellow
    aws dynamodb update-table `
        --table-name $tableName `
        --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES
    Write-Host "Streams habilitados" -ForegroundColor Green
}

# Obtener Stream ARN
$streamArn = aws dynamodb describe-table --table-name $tableName --query "Table.LatestStreamArn" --output text

# Obtener Lambda ARN
Write-Host ""
Write-Host "Buscando Lambda process-speaker-application..." -ForegroundColor Cyan
$lambdaArn = aws lambda list-functions --query "Functions[?contains(FunctionName, 'processspeakerapplicatio')].FunctionArn" --output text

if (-not $lambdaArn) {
    Write-Host "No se encontro la Lambda" -ForegroundColor Red
    exit 1
}

Write-Host "Lambda encontrada" -ForegroundColor Green

# Verificar si el mapping ya existe
Write-Host ""
Write-Host "Verificando Event Source Mapping existente..." -ForegroundColor Cyan
$existingMapping = aws lambda list-event-source-mappings `
    --function-name $lambdaArn `
    --query "EventSourceMappings[?EventSourceArn=='$streamArn'].UUID" `
    --output text

if ($existingMapping) {
    Write-Host "Event Source Mapping ya existe (UUID: $existingMapping)" -ForegroundColor Green
    Write-Host "No es necesario crear uno nuevo" -ForegroundColor Gray
} else {
    Write-Host "Creando Event Source Mapping..." -ForegroundColor Yellow
    
    $result = aws lambda create-event-source-mapping `
        --function-name $lambdaArn `
        --event-source-arn $streamArn `
        --starting-position LATEST `
        --batch-size 10 `
        --maximum-batching-window-in-seconds 1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Event Source Mapping creado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "Error creando mapping" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  CONFIGURACION COMPLETADA" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "  - Tabla: $tableName" -ForegroundColor Gray
Write-Host "  - Lambda: process-speaker-application" -ForegroundColor Gray
Write-Host "  - Stream: Conectado" -ForegroundColor Gray
Write-Host ""
Write-Host "Siguiente paso: Configurar SES para envio de emails" -ForegroundColor Yellow
Write-Host "Ejecuta: .\setup-ses.ps1" -ForegroundColor Gray
Write-Host ""
