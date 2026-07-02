@echo off
title Stable Reverse Proxy Tunnel (Y2K Photobooth)
echo ==============================================
echo  Y2K PHOTOBOOTH - STABLE TUNNEL CONNECTION
echo ==============================================
echo Keepalive packets: Every 30 seconds
echo Auto-reconnect: ENABLED
echo Platform: Serveo.net (High Speed - Zero Warnings)
echo ==============================================
echo.

:loop
echo [Running] Connecting to Serveo...
ssh -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 80:127.0.0.1:3001 serveo.net
echo.
echo [!] Tunnel connection disconnected! Reconnecting in 3 seconds...
timeout /t 3 >nul
goto loop
