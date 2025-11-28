# Script para obtener ARNs y nombres de recursos después del deploy
# Ejecutar DESPUÉS de que el sandbox termine de desplegar

Write-Host "🔍 Obteniendo recursos del backend AWS Amplify..." -ForegroundColor Cyan
Write-Host ""

# 1. Obtener User Pool ID
Write-Host "📋 Cognito User Pool:" -ForegroundColor Yellow
$userPools = aws cognito-idp list-user-pools --max-results 10 | ConvertFrom-Json
$awsPueblaPool = $userPools.UserPools | Where-Object { $_.Name -like "*awsug*" } | Select-Object -First 1
if ($awsPueblaPool) {
    Write-Host "   User Pool ID: $($awsPueblaPool.Id)" -ForegroundColor Green
    $userPoolId = $awsPueblaPool.Id
} else {
    Write-Host "   ❌ No se encontró User Pool" -ForegroundColor Red
}

Write-Host ""

# 2. Obtener Lambdas
Write-Host "⚡ Lambda Functions:" -ForegroundColor Yellow
$lambdas = aws lambda list-functions | ConvertFrom-Json

$processLambda = $lambdas.Functions | Where-Object { $_.FunctionName -like "*process-speaker*" } | Select-Object -First 1
$approveLambda = $lambdas.Functions | Where-Object { $_.FunctionName -like "*approve-speaker*" } | Select-Object -First 1
$postAuthLambda = $lambdas.Functions | Where-Object { $_.FunctionName -like "*post-authentication*" } | Select-Object -First 1

if ($processLambda) {
    Write-Host "   Process Lambda:" -ForegroundColor Green
    Write-Host "      Name: $($processLambda.FunctionName)"
    Write-Host "      ARN:  $($processLambda.FunctionArn)"
}

if ($approveLambda) {
    Write-Host "   Approve Lambda:" -ForegroundColor Green
    Write-Host "      Name: $($approveLambda.FunctionName)"
    Write-Host "      ARN:  $($approveLambda.FunctionArn)"
}

if ($postAuthLambda) {
    Write-Host "   PostAuth Lambda:" -ForegroundColor Green
    Write-Host "      Name: $($postAuthLambda.FunctionName)"
    Write-Host "      ARN:  $($postAuthLambda.FunctionArn)"
}

Write-Host ""

# 3. Obtener DynamoDB Tables
Write-Host "📊 DynamoDB Tables:" -ForegroundColor Yellow
$tables = aws dynamodb list-tables | ConvertFrom-Json

$speakerAppTable = $tables.TableNames | Where-Object { $_ -like "*SpeakerApplication*" } | Select-Object -First 1
$userTable = $tables.TableNames | Where-Object { $_ -like "*User-*" -and $_ -notlike "*SpeakerApplication*" } | Select-Object -First 1

if ($speakerAppTable) {
    Write-Host "   SpeakerApplication Table: $speakerAppTable" -ForegroundColor Green
    
    # Obtener Stream ARN
    $tableDetails = aws dynamodb describe-table --table-name $speakerAppTable | ConvertFrom-Json
    if ($tableDetails.Table.LatestStreamArn) {
        Write-Host "   Stream ARN: $($tableDetails.Table.LatestStreamArn)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Stream no habilitado en esta tabla" -ForegroundColor Yellow
    }
}

if ($userTable) {
    Write-Host "   User Table: $userTable" -ForegroundColor Green
}

Write-Host ""

# 4. Verificar SES
Write-Host "📧 Amazon SES:" -ForegroundColor Yellow
$sesIdentities = aws ses list-identities | ConvertFrom-Json
if ($sesIdentities.Identities.Count -gt 0) {
    Write-Host "   Identidades verificadas:" -ForegroundColor Green
    foreach ($identity in $sesIdentities.Identities) {
        Write-Host "      - $identity"
    }
} else {
    Write-Host "   ⚠️  No hay identidades verificadas en SES" -ForegroundColor Yellow
    Write-Host "   💡 Tip: Verifica un email o usa SES Sandbox" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✅ Proceso completado!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Configurar DynamoDB Stream trigger"
Write-Host "   2. Crear IAM role para EventBridge Scheduler"
Write-Host "   3. Verificar email en SES"
Write-Host "   4. Probar flujo completo"
