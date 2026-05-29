@echo off
echo ============================================
echo Building Five Stones RAS Desktop Alert
echo ============================================
echo.

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

echo [1/2] Restoring packages...
dotnet restore -q

echo [2/2] Publishing standalone EXE...
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -o ./dist

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo BUILD COMPLETE!
    echo ============================================
    echo.
    echo Your standalone EXE is ready at:
    echo   %cd%\dist\FiveStonesRASAlert.exe
    echo.
    echo This is a FULLY SELF-CONTAINED executable.
    echo It includes the .NET runtime and does NOT
    echo require .NET SDK or runtime to be installed
    echo on the target computer.
    echo.
    echo Size: 
    for %%I in ("dist\FiveStonesRASAlert.exe") do echo   %%~zI bytes (%%~zI/1024 KB)
    echo.
    echo Total dist folder contents:
    dir /b "dist\"
    echo.
    echo To install on another computer, simply copy
    echo the entire 'dist' folder and run:
    echo   FiveStonesRASAlert.exe
) else (
    echo.
    echo BUILD FAILED. Check errors above.
)

pause