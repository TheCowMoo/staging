@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo Building Five Stones RAS Desktop Alert
echo ============================================
echo.

REM ────── STEP 1: Build .NET self-contained EXE ──────
echo [1/3] Building self-contained EXE...

REM Check if .NET SDK is installed
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: .NET SDK 8.0 is required to build this application.
    echo.
    echo Download and install it from:
    echo https://dotnet.microsoft.com/download/dotnet/8.0
    echo.
    pause
    exit /b 1
)

echo [1/3] Restoring packages...
call dotnet restore -q

echo [2/3] Publishing standalone EXE...
call dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -o ./dist

if %errorlevel% neq 0 (
    echo.
    echo BUILD FAILED. Check errors above.
    pause
    exit /b 1
)

echo.
echo   EXE created: dist\FiveStonesRASAlert.exe
for %%I in ("dist\FiveStonesRASAlert.exe") do (
    set "exesize=%%~zI"
    set /a exesizekb=%%~zI / 1024
    echo   Size: !exesize! bytes (!exesizekb! KB)
)
echo.

REM ────── STEP 2: Build Inno Setup installer ──────
echo [3/3] Building installer...

REM Check for Inno Setup (ISCC) — try common paths
set ISCC_PATH=
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set ISCC_PATH="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe" set ISCC_PATH="C:\Program Files\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files (x86)\Inno Setup 5\ISCC.exe" set ISCC_PATH="C:\Program Files (x86)\Inno Setup 5\ISCC.exe"
if exist "C:\Program Files\Inno Setup 5\ISCC.exe" set ISCC_PATH="C:\Program Files\Inno Setup 5\ISCC.exe"

if defined ISCC_PATH (
    echo   Compiling with Inno Setup...
    %ISCC_PATH% "setup.iss" /Q
    if !errorlevel! equ 0 (
        echo   SUCCESS! Installer created: ..\dist\FiveStonesRASAlert-Setup.exe
        for %%I in ("..\dist\FiveStonesRASAlert-Setup.exe") do (
            set "setsize=%%~zI"
            set /a setsizekb=%%~zI / 1024
            echo   Size: !setsize! bytes (!setsizekb! KB)
        )
    ) else (
        echo   WARNING: Inno Setup compilation failed (error code !errorlevel!)
        echo   You can manually compile: iscc setup.iss
    )
) else (
    echo   WARNING: Inno Setup not found. Install from https://jrsoftware.org/isdl.php
    echo   Or manually compile: iscc setup.iss
    echo.
    echo   The EXE has been built successfully regardless.
)

echo.
echo ============================================
echo BUILD COMPLETE!
echo ============================================
echo.
echo Output files:
echo   dist\FiveStonesRASAlert.exe         - Standalone desktop alert app
echo   ..\dist\FiveStonesRASAlert-Setup.exe  - Windows installer (if Inno Setup available)
echo.
echo To install: run the Setup.exe on any Windows computer
echo No .NET runtime, Node.js, or Python required.
echo.
pause