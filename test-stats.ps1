# Login
$body = @{
    email = 'admin@hotelchain.com'
    password = '123456'
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method POST -ContentType 'application/json' -Body $body

Write-Host "Login exitoso. Token: $($loginResponse.token.Substring(0,20))..."

# Obtener estadísticas
$headers = @{
    Authorization = "Bearer $($loginResponse.token)"
}

$statsResponse = Invoke-RestMethod -Uri 'http://localhost:4000/api/estadisticas/generales' -Method GET -Headers $headers

Write-Host "Estadísticas obtenidas:"
$statsResponse | ConvertTo-Json -Depth 5