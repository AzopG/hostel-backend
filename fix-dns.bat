@echo off
echo 🔧 Cambiando DNS a Google (8.8.8.8 y 8.8.4.4)
echo.
echo IMPORTANTE: Ejecutar como Administrador
echo.

REM Obtener el nombre de la conexión de red activa
for /f "tokens=1" %%i in ('netsh interface show interface ^| findstr "Conectado"') do set INTERFACE=%%i

echo Configurando DNS...
netsh interface ip set dns "Wi-Fi" static 8.8.8.8
netsh interface ip add dns "Wi-Fi" 8.8.4.4 index=2

echo.
echo ✅ DNS cambiado a Google
echo.
echo Probando conexión...
nslookup cluster0.9swl2u0.mongodb.net 8.8.8.8
echo.
echo Si el nslookup funciona, ejecuta: node test-mongodb-atlas.js
pause