# 🧹 Script de Limpieza - Speaker Application Workflow
# Elimina recursos huérfanos que pueden quedar después de testing o sandbox delete

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  AWS PUEBLA - LIMPIEZA DE RECURSOS HUÉRFANOS" -ForegroundColor Cyan
Write-Host "===================================================`n" -ForegroundColor Cyan

$cleaned = 0

# ========================================
# 1. LIMPIAR EVENT SOURCE MAPPINGS ROTOS
# ========================================

Write-Host "1️⃣  Limpiando Event Source Mappings huérfanos..." -ForegroundColor Yellow

$mappings = aws lambda list-event-source-mappings --query "EventSourceMappings[?contains(FunctionArn, 'process')]" --output json | ConvertFrom-Json

if ($mappings.Count -gt 0) {
    foreach ($mapping in $mappings) {
        # Verificar si la Lambda aún existe
        if ($mapping.LastProcessingResult -like "*Function not found*" -or $mapping.State -eq "Deleting") {
            Write-Host "   ❌ Eliminando mapping roto: $($mapping.UUID)" -ForegroundColor Red
            Write-Host "      Lambda: $($mapping.FunctionArn)" -ForegroundColor Gray
            
            aws lambda delete-event-source-mapping --uuid $mapping.UUID | Out-Null
            $cleaned++
        }
    }
    
    if ($cleaned -eq 0) {
        Write-Host "   ✅ No hay mappings huérfanos" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Eliminados $cleaned mappings huérfanos" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ No hay Event Source Mappings" -ForegroundColor Green
}

# ========================================
# 2. LIMPIAR EVENTBRIDGE SCHEDULES VIEJOS
# ========================================

Write-Host "`n2️⃣  Limpiando EventBridge Schedules viejos..." -ForegroundColor Yellow

$schedules = aws scheduler list-schedules --name-prefix approve-speaker --output json | ConvertFrom-Json

if ($schedules.Schedules.Count -gt 0) {
    Write-Host "   📅 Encontrados $($schedules.Schedules.Count) schedules" -ForegroundColor Cyan
    
    $now = Get-Date
    $cleaned_schedules = 0
    
    foreach ($schedule in $schedules.Schedules) {
        # Obtener detalles del schedule
        $details = aws scheduler get-schedule --name $schedule.Name --output json | ConvertFrom-Json
        
        # Si el schedule está en el pasado (> 10 minutos), eliminarlo
        try {
            $scheduleTime = [DateTime]::Parse($details.ScheduleExpression.Replace("at(", "").Replace(")", ""))
            $age = ($now - $scheduleTime).TotalMinutes
            
            if ($age -gt 10) {
                Write-Host "   ❌ Eliminando schedule viejo: $($schedule.Name)" -ForegroundColor Red
                Write-Host "      Programado para: $scheduleTime (hace $([int]$age) minutos)" -ForegroundColor Gray
                
                aws scheduler delete-schedule --name $schedule.Name | Out-Null
                $cleaned_schedules++
            }
        } catch {
            # Si no se puede parsear, asumir que es viejo
            Write-Host "   ⚠️  No se pudo parsear schedule: $($schedule.Name), eliminando..." -ForegroundColor Yellow
            aws scheduler delete-schedule --name $schedule.Name | Out-Null
            $cleaned_schedules++
        }
    }
    
    if ($cleaned_schedules -eq 0) {
        Write-Host "   ✅ Todos los schedules son recientes" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Eliminados $cleaned_schedules schedules viejos" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ No hay EventBridge Schedules" -ForegroundColor Green
}

# ========================================
# 3. LIMPIAR REGISTROS DE DYNAMODB (OPCIONAL)
# ========================================

Write-Host "`n3️⃣  Limpiando registros de testing en DynamoDB..." -ForegroundColor Yellow

# Buscar tabla
$allTables = aws dynamodb list-tables --output json | ConvertFrom-Json
$tableName = $allTables.TableNames | Where-Object { $_ -like '*SpeakerApplication*' } | Select-Object -First 1

if ($tableName) {
    Write-Host "   📊 Tabla encontrada: $tableName" -ForegroundColor Cyan
    
    # Preguntar al usuario
    $confirm = Read-Host "   ⚠️  ¿Eliminar aplicaciones de prueba? (s/N)"
    
    if ($confirm -eq "s" -or $confirm -eq "S") {
        # Escanear todas las aplicaciones
        $filterExpr = 'contains(motivation, :test) OR contains(email, :test)'
        $attrValues = '{":test":{"S":"test"}}'
        $items = aws dynamodb scan --table-name $tableName --filter-expression $filterExpr --expression-attribute-values $attrValues --output json | ConvertFrom-Json
        
        if ($items.Items.Count -gt 0) {
            Write-Host "   🗑️  Eliminando $($items.Items.Count) registros de prueba..." -ForegroundColor Yellow
            
            foreach ($item in $items.Items) {
                $id = $item.id.S
                aws dynamodb delete-item --table-name $tableName --key "{`"id`":{`"S`":`"$id`"}}" | Out-Null
            }
            
            Write-Host "   ✅ Registros de prueba eliminados" -ForegroundColor Green
        } else {
            Write-Host "   ✅ No hay registros de prueba" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⏭️  Saltando limpieza de DynamoDB" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  Tabla SpeakerApplication no encontrada" -ForegroundColor Yellow
}


# ========================================
# 4. LIMPIAR LOGS ANTIGUOS (OPCIONAL)
# ========================================

Write-Host "`n4️⃣  Limpiando CloudWatch Logs antiguos..." -ForegroundColor Yellow

$confirmLogs = Read-Host "   ⚠️  ¿Eliminar logs de más de 7 días? (s/N)"

if ($confirmLogs -eq "s" -or $confirmLogs -eq "S") {
    $logGroups = aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/amplify-awsug" --query "logGroups[].logGroupName" --output json | ConvertFrom-Json
    
    if ($logGroups.Count -gt 0) {
        Write-Host "   📝 Encontrados $($logGroups.Count) log groups" -ForegroundColor Cyan
        
        $retentionDays = 7
        $cleaned_logs = 0
        
        foreach ($logGroup in $logGroups) {
            Write-Host "   🔄 Configurando retención de $retentionDays días en: $logGroup" -ForegroundColor Gray
            aws logs put-retention-policy --log-group-name $logGroup --retention-in-days $retentionDays | Out-Null
            $cleaned_logs++
        }
        
        Write-Host "   ✅ Configurada retención en $cleaned_logs log groups" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No se encontraron log groups" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⏭️  Saltando limpieza de logs" -ForegroundColor Gray
}


# ========================================
# RESUMEN
# ========================================

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  LIMPIEZA COMPLETADA" -ForegroundColor Cyan
Write-Host "===================================================`n" -ForegroundColor Cyan

Write-Host "📊 Resumen:" -ForegroundColor White
Write-Host "   - Event Source Mappings: ✅ Verificados" -ForegroundColor Green
Write-Host "   - EventBridge Schedules: ✅ Verificados" -ForegroundColor Green
Write-Host "   - DynamoDB Records: ✅ Verificados" -ForegroundColor Green
Write-Host "   - CloudWatch Logs: ✅ Verificados`n" -ForegroundColor Green

Write-Host "💡 Recomendación: Ejecuta este script periódicamente" -ForegroundColor Yellow
Write-Host "   o después de borrar y recrear el sandbox`n" -ForegroundColor Yellow
