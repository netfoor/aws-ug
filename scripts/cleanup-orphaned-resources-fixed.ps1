# 🧹 Script de Limpieza - AWS Puebla Connect
# Elimina recursos huérfanos que pueden quedar después de testing o sandbox delete
#
# ⚠️  IMPORTANTE: CloudWatch Log Retention ahora se gestiona automáticamente vía CDK
#    Este script solo limpia Event Source Mappings y EventBridge Schedules huérfanos

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  AWS PUEBLA - LIMPIEZA DE RECURSOS HUÉRFANOS" -ForegroundColor Cyan
Write-Host "===================================================`n" -ForegroundColor Cyan

$totalCleaned = 0

# ========================================
# 1. LIMPIAR EVENT SOURCE MAPPINGS ROTOS
# ========================================

Write-Host "1️⃣  Limpiando Event Source Mappings huérfanos..." -ForegroundColor Yellow

try {
    $mappings = aws lambda list-event-source-mappings --query "EventSourceMappings[?contains(FunctionArn, 'process')]" --output json | ConvertFrom-Json
    
    if ($mappings -and $mappings.Count -gt 0) {
        $cleanedMappings = 0
        
        foreach ($mapping in $mappings) {
            # Verificar si la Lambda o el Stream ya no existen
            if ($mapping.State -eq "Deleting" -or 
                $mapping.LastProcessingResult -like "*ResourceNotFoundException*" -or 
                $mapping.LastProcessingResult -like "*Function not found*") {
                
                Write-Host "   ❌ Eliminando mapping roto: $($mapping.UUID)" -ForegroundColor Red
                Write-Host "      Lambda: $($mapping.FunctionArn)" -ForegroundColor Gray
                Write-Host "      Estado: $($mapping.State)" -ForegroundColor Gray
                
                aws lambda delete-event-source-mapping --uuid $mapping.UUID 2>&1 | Out-Null
                
                if ($LASTEXITCODE -eq 0) {
                    $cleanedMappings++
                    $totalCleaned++
                }
            }
        }
        
        if ($cleanedMappings -eq 0) {
            Write-Host "   ✅ No hay mappings huérfanos" -ForegroundColor Green
        } else {
            Write-Host "   ✅ Eliminados $cleanedMappings mappings huérfanos" -ForegroundColor Green
        }
    } else {
        Write-Host "   ℹ️  No hay Event Source Mappings" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Error verificando mappings: $_" -ForegroundColor Yellow
}

# ========================================
# 2. LIMPIAR EVENTBRIDGE SCHEDULES VIEJOS
# ========================================

Write-Host "`n2️⃣  Limpiando EventBridge Schedules viejos..." -ForegroundColor Yellow

try {
    $schedules = aws scheduler list-schedules --name-prefix approve-speaker --output json | ConvertFrom-Json
    
    if ($schedules.Schedules -and $schedules.Schedules.Count -gt 0) {
        Write-Host "   📅 Encontrados $($schedules.Schedules.Count) schedules" -ForegroundColor Cyan
        
        $now = Get-Date
        $cleanedSchedules = 0
        
        foreach ($schedule in $schedules.Schedules) {
            try {
                # Obtener detalles del schedule
                $details = aws scheduler get-schedule --name $schedule.Name --output json 2>&1 | ConvertFrom-Json
                
                # Si el schedule está en el pasado (> 10 minutos), eliminarlo
                if ($details.ScheduleExpression -match "at\((.+)\)") {
                    $scheduleTime = [DateTime]::Parse($matches[1])
                    $age = ($now - $scheduleTime).TotalMinutes
                    
                    if ($age -gt 10) {
                        Write-Host "   ❌ Eliminando schedule viejo: $($schedule.Name)" -ForegroundColor Red
                        Write-Host "      Programado para: $scheduleTime (hace $([int]$age) minutos)" -ForegroundColor Gray
                        
                        aws scheduler delete-schedule --name $schedule.Name 2>&1 | Out-Null
                        
                        if ($LASTEXITCODE -eq 0) {
                            $cleanedSchedules++
                            $totalCleaned++
                        }
                    }
                }
            } catch {
                # Si no se puede parsear o el schedule no existe, intentar eliminar
                Write-Host "   ⚠️  No se pudo verificar schedule: $($schedule.Name), eliminando..." -ForegroundColor Yellow
                aws scheduler delete-schedule --name $schedule.Name 2>&1 | Out-Null
                
                if ($LASTEXITCODE -eq 0) {
                    $cleanedSchedules++
                    $totalCleaned++
                }
            }
        }
        
        if ($cleanedSchedules -eq 0) {
            Write-Host "   ✅ Todos los schedules son recientes" -ForegroundColor Green
        } else {
            Write-Host "   ✅ Eliminados $cleanedSchedules schedules viejos" -ForegroundColor Green
        }
    } else {
        Write-Host "   ℹ️  No hay EventBridge Schedules" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Error verificando schedules: $_" -ForegroundColor Yellow
}

# ========================================
# 3. LIMPIAR REGISTROS DE DYNAMODB (OPCIONAL)
# ========================================

Write-Host "`n3️⃣  Limpiando registros de testing en DynamoDB..." -ForegroundColor Yellow

try {
    # Buscar tabla SpeakerApplication
    $allTables = aws dynamodb list-tables --output json | ConvertFrom-Json
    $tableName = $allTables.TableNames | Where-Object { $_ -like '*SpeakerApplication*' } | Select-Object -First 1
    
    if ($tableName) {
        Write-Host "   📊 Tabla encontrada: $tableName" -ForegroundColor Cyan
        
        # Preguntar al usuario
        $confirm = Read-Host "   ⚠️  ¿Eliminar aplicaciones de prueba? (s/N)"
        
        if ($confirm -eq "s" -or $confirm -eq "S") {
            # Escanear aplicaciones con "test" en motivation o email
            $filterExpr = 'contains(motivation, :test) OR contains(email, :test)'
            $attrValues = '{":test":{"S":"test"}}'
            
            $items = aws dynamodb scan `
                --table-name $tableName `
                --filter-expression $filterExpr `
                --expression-attribute-values $attrValues `
                --output json 2>&1 | ConvertFrom-Json
            
            if ($items.Items -and $items.Items.Count -gt 0) {
                Write-Host "   🗑️  Eliminando $($items.Items.Count) registros de prueba..." -ForegroundColor Yellow
                
                $deletedItems = 0
                foreach ($item in $items.Items) {
                    $id = $item.id.S
                    aws dynamodb delete-item --table-name $tableName --key "{`"id`":{`"S`":`"$id`"}}" 2>&1 | Out-Null
                    
                    if ($LASTEXITCODE -eq 0) {
                        $deletedItems++
                        $totalCleaned++
                    }
                }
                
                Write-Host "   ✅ Eliminados $deletedItems registros de prueba" -ForegroundColor Green
            } else {
                Write-Host "   ✅ No hay registros de prueba" -ForegroundColor Green
            }
        } else {
            Write-Host "   ⏭️  Saltando limpieza de DynamoDB" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ℹ️  Tabla SpeakerApplication no encontrada" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  Error verificando DynamoDB: $_" -ForegroundColor Yellow
}

# ========================================
# RESUMEN
# ========================================

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "  ✅ LIMPIEZA COMPLETADA" -ForegroundColor Cyan
Write-Host "===================================================`n" -ForegroundColor Cyan

Write-Host "📊 Resumen:" -ForegroundColor White
Write-Host "   • Event Source Mappings: ✅ Verificados" -ForegroundColor Green
Write-Host "   • EventBridge Schedules: ✅ Verificados" -ForegroundColor Green
Write-Host "   • DynamoDB Records: ✅ Verificados" -ForegroundColor Green
Write-Host "   • CloudWatch Logs: ✅ Gestionados automáticamente por CDK" -ForegroundColor Green
Write-Host ""
Write-Host "   Total de recursos eliminados: $totalCleaned" -ForegroundColor Cyan
Write-Host ""

if ($totalCleaned -eq 0) {
    Write-Host "✨ ¡No hay recursos huérfanos! Tu infraestructura está limpia." -ForegroundColor Green
} else {
    Write-Host "🧹 Se eliminaron $totalCleaned recursos huérfanos." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Nota: CloudWatch Log Retention se gestiona automáticamente vía CDK (7 días)" -ForegroundColor Cyan
Write-Host "   Ya no es necesario limpiar logs manualmente." -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Recomendación: Ejecuta este script periódicamente (cada mes)" -ForegroundColor Yellow
Write-Host "   o después de borrar y recrear el sandbox.`n" -ForegroundColor Yellow
