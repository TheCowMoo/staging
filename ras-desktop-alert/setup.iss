; Five Stones RAS Alert — Inno Setup Installer Script
; Build: iscc setup.iss

#define MyAppName "Five Stones RAS Alert"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Five Stones Technology"
#define MyAppURL "https://fivestonestechnology.com"
#define MyAppExeName "FiveStonesRASAlert.exe"

[Setup]
AppId={{B8F3A1E2-5C7D-4A9E-8F2B-3D6C1E9A5F7B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}/api/ras/update/version.json
DefaultDirName={commonpf}\FiveStones\RAS Alert
DefaultGroupName=Five Stones
AllowNoIcons=yes
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=..\dist
OutputBaseFilename=FiveStonesRASAlert-Setup
SetupIconFile=app.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
ShowLanguageDialog=no
LanguageDetectionMethod=none

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: checkedonce
Name: "runatstartup"; Description: "&Launch at Windows startup"; GroupDescription: "Additional options:"; Flags: checkedonce

[Files]
Source: "..\ras-desktop-alert\dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\ras-desktop-alert\app.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: postinstall nowait skipifsilent shellexec
Filename: "{reg:HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run,FiveStonesRASAlert}"; Flags: skipifdoesntexist

[Registry]
; Add Run at startup if user checked the task during install
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "FiveStonesRASAlert"; ValueData: """{app}\{#MyAppExeName}"""; Tasks: runatstartup; Flags: uninsdeletevalue

[UninstallRun]
Filename: "{app}\{#MyAppExeName}"; Parameters: "--uninstall"; RunOnceId: "FiveStonesRASAlertShutdown"; Flags: runhidden

[Code]
{ Custom uninstall to ensure the app isn't running }
function InitializeUninstall(): Boolean;
var
  ResultCode: Integer;
begin
  Exec(ExpandConstant('{app}\{#MyAppExeName}'), '--close', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := True;
end;