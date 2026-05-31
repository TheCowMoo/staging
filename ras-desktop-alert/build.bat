@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo Building Five Stones RAS Alert v1.1.0
echo ============================================
echo.

REM ────── STEP 1: Check prerequisites ──────
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: .NET SDK 8.0+ is required.
    echo Download: https://dotnet.microsoft.com/download/dotnet/8.0
    pause
    exit /b 1
)

if not exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    if not exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
        echo ERROR: Inno Setup 6 not found.
        echo Download: https://jrsoftware.org/isdl.php
        pause
        exit /b 1
    )
)

REM ────── STEP 2: Publish self-contained EXE ──────
echo [1/2] Publishing standalone EXE...
call dotnet publish -c Release -r win-x64 --self-contained true ^
    -p:PublishSingleFile=true ^
    -p:IncludeNativeLibrariesForSelfExtract=true ^
    -p:DebugType=none ^
    -o ./dist

if %errorlevel% neq 0 (
    echo BUILD FAILED.
    pause
    exit /b 1
)

for %%I in ("dist\FiveStonesRASAlert.exe") do (
    set /a exesizekb=%%~zI / 1024
    echo   EXE: dist\FiveStonesRASAlert.exe (!exesizekb! KB)
)

echo.

REM ────── STEP 3: Compile installer ──────
echo [2/2] Compiling installer...
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "setup.iss" /Q
) else (
    "C:\Program Files\Inno Setup 6\ISCC.exe" "setup.iss" /Q
)

if %errorlevel% equ 0 (
    for %%I in ("..\dist\FiveStonesRASAlert-Setup.exe") do (
        set /a setsizekb=%%~zI / 1024
        echo   Installer: ..\dist\FiveStonesRASAlert-Setup.exe (!setsizekb! KB)
    )
) else (
    echo   WARNING: Installer compilation failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo BUILD COMPLETE!
echo ============================================
echo.
echo Deployable file:
echo   ..\dist\FiveStonesRASAlert-Setup.exe
echo.
echo Install on any Windows machine (no .NET required).
echo.
pause