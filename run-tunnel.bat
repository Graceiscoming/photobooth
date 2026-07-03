@echo off
title Stable Cloudflare Tunnel (Y2K Photobooth)
echo ==============================================
echo  Y2K PHOTOBOOTH - CLOUDFLARE TUNNEL CONNECTION
echo ==============================================
echo Platform: Cloudflare Quick Tunnels (TryCloudflare)
echo Auto-Fallback: Enabled (cloudflared cli -> npx untun)
echo Target Port: 3001
echo ==============================================
echo.

:: Check if cloudflared is installed
where cloudflared >nul 2>nul
if %errorlevel% equ 0 (
    echo [Info] Found official cloudflared CLI. Starting tunnel...
    :loop_cf
    cloudflared tunnel --url http://localhost:3001
    echo.
    echo [!] Tunnel disconnected! Reconnecting in 3 seconds...
    timeout /t 3 >nul
    goto loop_cf
) else (
    echo [Info] cloudflared CLI not found in PATH.
    echo [Info] Falling back to zero-setup mode using "npx untun"...
    echo.
    :loop_untun
    npx untun@latest tunnel http://localhost:3001
    echo.
    echo [!] Tunnel disconnected! Reconnecting in 3 seconds...
    timeout /t 3 >nul
    goto loop_untun
)
