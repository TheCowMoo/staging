using System;
using System.Drawing;
using System.IO;
using System.Media;
using System.Net.Http;
using System.Diagnostics;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

namespace RasDesktopAlert
{
    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            // Handle command-line arguments (used by installer/uninstaller)
            var args = Environment.GetCommandLineArgs();
            if (args.Length > 1)
            {
                switch (args[1].ToLowerInvariant())
                {
                    case "--close":
                        var current = Process.GetCurrentProcess();
                        foreach (var proc in Process.GetProcessesByName(current.ProcessName))
                        {
                            if (proc.Id != current.Id)
                            {
                                proc.Kill();
                                proc.WaitForExit(3000);
                            }
                        }
                        return;

                    case "--uninstall":
                        SettingsManager.EnsureDirectoryExists();
                        SettingsManager.ApplyAutoStart(false);
                        return;
                }
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new TrayApplication());
        }
    }

    // ─── SETTINGS MODEL ───────────────────────────────────────────────────────────
    public class AppSettings
    {
        [JsonPropertyName("apiBaseUrl")]
        public string ApiBaseUrl { get; set; } = "https://staging.fivestonestechnology.com";

        [JsonPropertyName("apiKey")]
        public string ApiKey { get; set; } = "";

        [JsonPropertyName("orgId")]
        public int OrgId { get; set; } = 0;

        [JsonPropertyName("autoStart")]
        public bool AutoStart { get; set; } = false;
    }

    // ─── SETTINGS MANAGER ─────────────────────────────────────────────────────────
    public static class SettingsManager
    {
        private static readonly string AppDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "FiveStones", "RAS Alert");

        private static readonly string SettingsPath = Path.Combine(AppDir, "ras_settings.json");
        private static readonly string LogPath = Path.Combine(AppDir, "ras_error.log");

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true
        };

        public static void EnsureDirectoryExists()
        {
            try { Directory.CreateDirectory(AppDir); } catch { }
        }

        public static AppSettings Load()
        {
            EnsureDirectoryExists();
            try
            {
                if (File.Exists(SettingsPath))
                {
                    var json = File.ReadAllText(SettingsPath);
                    return JsonSerializer.Deserialize<AppSettings>(json, JsonOpts) ?? new AppSettings();
                }
            }
            catch (Exception ex)
            {
                Log($"Failed to load settings: {ex.Message}");
            }
            return new AppSettings();
        }

        public static void Save(AppSettings settings)
        {
            EnsureDirectoryExists();
            try
            {
                var json = JsonSerializer.Serialize(settings, JsonOpts);
                File.WriteAllText(SettingsPath, json);
                ApplyAutoStart(settings.AutoStart);
            }
            catch (Exception ex)
            {
                Log($"Failed to save settings: {ex.Message}");
            }
        }

        public static void ApplyAutoStart(bool enable)
        {
            try
            {
                const string keyName = @"Software\Microsoft\Windows\CurrentVersion\Run";
                using var key = Registry.CurrentUser.CreateSubKey(keyName, writable: true);
                if (enable)
                    key.SetValue("FiveStonesRASAlert", $"\"{Application.ExecutablePath}\"");
                else
                {
                    if (key.GetValue("FiveStonesRASAlert") != null)
                        key.DeleteValue("FiveStonesRASAlert");
                }
            }
            catch (Exception ex)
            {
                Log($"Failed to set auto-start: {ex.Message}");
            }
        }

        public static void Log(string message)
        {
            try
            {
                EnsureDirectoryExists();
                var line = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} - {message}{Environment.NewLine}";
                File.AppendAllText(LogPath, line);
            }
            catch { }
        }
    }

    // ─── ALERT SOUND PLAYER ───────────────────────────────────────────────────────
    public static class AlertSoundPlayer
    {
        private static SoundPlayer _player;

        /// <summary>
        /// Generate a simple siren WAV in memory and play it in a loop.
        /// The siren alternates between two frequencies (600 Hz and 900 Hz)
        /// to create a classic emergency tone.
        /// </summary>
        public static void PlaySiren()
        {
            try
            {
                StopSiren();
                _player = GenerateSirenSound();
                _player.PlayLooping();
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Failed to play siren: {ex.Message}");
            }
        }

        public static void StopSiren()
        {
            if (_player != null)
            {
                try
                {
                    _player.Stop();
                    _player.Dispose();
                }
                catch { }
                _player = null;
            }
        }

        private static SoundPlayer GenerateSirenSound()
        {
            // Generate a WAV file in memory: ~3 seconds of alternating tone siren
            int sampleRate = 22050;
            int durationMs = 3000;
            int numSamples = sampleRate * durationMs / 1000;
            short[] samples = new short[numSamples];

            double freq1 = 600.0; // Lower tone
            double freq2 = 900.0; // Higher tone
            double cycleMs = 500.0; // Switch every 500ms

            for (int i = 0; i < numSamples; i++)
            {
                double t = (double)i / sampleRate;
                double elapsedMs = t * 1000;
                // Switch frequency every cycleMs
                double freq = ((int)(elapsedMs / cycleMs) % 2 == 0) ? freq1 : freq2;
                double sin = Math.Sin(2.0 * Math.PI * freq * t);
                // Apply envelope: fade in/out slightly to avoid clicks
                double envelope = 1.0;
                if (elapsedMs < 50) envelope = elapsedMs / 50.0;
                if (elapsedMs > durationMs - 50) envelope = (durationMs - elapsedMs) / 50.0;
                samples[i] = (short)(sin * envelope * 16000); // 16000 = volume
            }

            // Build WAV header
            int dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
            int fileSize = 44 + dataSize;

            using var ms = new MemoryStream(fileSize);
            using var bw = new BinaryWriter(ms);

            // RIFF header
            bw.Write(new char[] { 'R', 'I', 'F', 'F' });
            bw.Write(fileSize - 8);
            bw.Write(new char[] { 'W', 'A', 'V', 'E' });

            // fmt chunk
            bw.Write(new char[] { 'f', 'm', 't', ' ' });
            bw.Write(16); // chunk size
            bw.Write((short)1); // PCM
            bw.Write((short)1); // mono
            bw.Write(sampleRate);
            bw.Write(sampleRate * 2); // byte rate
            bw.Write((short)2); // block align
            bw.Write((short)16); // bits per sample

            // data chunk
            bw.Write(new char[] { 'd', 'a', 't', 'a' });
            bw.Write(dataSize);
            foreach (short s in samples)
                bw.Write(s);

            bw.Flush();
            ms.Position = 0;
            return new SoundPlayer(ms);
        }
    }

    // ─── SETTINGS FORM ────────────────────────────────────────────────────────────
    public class SettingsForm : Form
    {
        private TextBox apiUrlBox;
        private TextBox apiKeyBox;
        private NumericUpDown orgIdBox;
        private CheckBox autoStartCheck;

        public string ApiBaseUrl { get => apiUrlBox.Text.Trim(); set => apiUrlBox.Text = value; }
        public string ApiKey { get => apiKeyBox.Text.Trim(); set => apiKeyBox.Text = value; }
        public int OrgId { get => (int)orgIdBox.Value; set => orgIdBox.Value = Math.Max(orgIdBox.Minimum, Math.Min(orgIdBox.Maximum, value)); }
        public bool AutoStart { get => autoStartCheck.Checked; set => autoStartCheck.Checked = value; }

        public SettingsForm()
        {
            this.Text = "RAS Alert - Settings";
            this.Size = new Size(540, 340);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Icon = LoadAppIcon();

            var mainPanel = new TableLayoutPanel()
            {
                Dock = DockStyle.Fill, Padding = new Padding(20), ColumnCount = 2, RowCount = 5,
                ColumnStyles = { new ColumnStyle(SizeType.Absolute, 110), new ColumnStyle(SizeType.Percent, 100) },
                RowStyles = {
                    new RowStyle(SizeType.Absolute, 40),
                    new RowStyle(SizeType.Absolute, 40),
                    new RowStyle(SizeType.Absolute, 40),
                    new RowStyle(SizeType.Absolute, 40),
                    new RowStyle(SizeType.Absolute, 60)
                }
            };

            var labelFont = new Font("Segoe UI", 10);
            var inputFont = new Font("Segoe UI", 10);

            mainPanel.Controls.Add(new Label() { Text = "API URL:", TextAlign = ContentAlignment.MiddleRight, Anchor = AnchorStyles.Right, Font = labelFont }, 0, 0);
            apiUrlBox = new TextBox() { Text = "https://staging.fivestonestechnology.com", Dock = DockStyle.Fill, Font = inputFont, Margin = new Padding(5, 5, 0, 5) };
            mainPanel.Controls.Add(apiUrlBox, 1, 0);

            mainPanel.Controls.Add(new Label() { Text = "API Key:", TextAlign = ContentAlignment.MiddleRight, Anchor = AnchorStyles.Right, Font = labelFont }, 0, 1);
            apiKeyBox = new TextBox() { PasswordChar = '*', Dock = DockStyle.Fill, Font = inputFont, Margin = new Padding(5, 5, 0, 5) };
            mainPanel.Controls.Add(apiKeyBox, 1, 1);

            mainPanel.Controls.Add(new Label() { Text = "Org ID:", TextAlign = ContentAlignment.MiddleRight, Anchor = AnchorStyles.Right, Font = labelFont }, 0, 2);
            orgIdBox = new NumericUpDown() { Minimum = 0, Maximum = 999999, Width = 120, Font = inputFont, Margin = new Padding(5, 5, 0, 5) };
            mainPanel.Controls.Add(orgIdBox, 1, 2);

            autoStartCheck = new CheckBox() { Text = "Run at Windows startup", Font = labelFont, Margin = new Padding(5, 5, 0, 5), AutoSize = true };
            mainPanel.Controls.Add(autoStartCheck, 1, 3);

            var buttonPanel = new FlowLayoutPanel() { Dock = DockStyle.Fill, FlowDirection = FlowDirection.RightToLeft, Margin = new Padding(0, 10, 0, 0) };

            var saveBtn = new Button()
            {
                Text = "Save & Connect", Size = new Size(130, 35), Font = new Font("Segoe UI", 10, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(11, 31, 51), ForeColor = Color.White,
                FlatAppearance = { BorderSize = 0 }, Cursor = Cursors.Hand
            };
            saveBtn.Click += (s, e) =>
            {
                if (string.IsNullOrWhiteSpace(apiUrlBox.Text) || string.IsNullOrWhiteSpace(apiKeyBox.Text))
                {
                    MessageBox.Show("Please fill all fields.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                DialogResult = DialogResult.OK;
                Close();
            };

            var cancelBtn = new Button() { Text = "Cancel", Size = new Size(100, 35), Font = new Font("Segoe UI", 10), Cursor = Cursors.Hand };
            cancelBtn.Click += (s, e) => { DialogResult = DialogResult.Cancel; Close(); };

            buttonPanel.Controls.Add(saveBtn);
            buttonPanel.Controls.Add(cancelBtn);
            mainPanel.Controls.Add(buttonPanel, 1, 4);

            this.Controls.Add(mainPanel);
            this.Controls.Add(new Label()
            {
                Text = "Get API key from Dashboard > Admin > API Keys.",
                Dock = DockStyle.Bottom, TextAlign = ContentAlignment.MiddleLeft,
                Font = new Font("Segoe UI", 8, FontStyle.Italic), ForeColor = Color.Gray,
                Height = 25, Padding = new Padding(20, 0, 0, 0)
            });
            this.AcceptButton = saveBtn;
            this.CancelButton = cancelBtn;
        }

        private static Icon LoadAppIcon()
        {
            try
            {
                using var stream = Assembly.GetExecutingAssembly()
                    .GetManifestResourceStream("RasDesktopAlert.app.ico");
                if (stream != null)
                    return new Icon(stream);
            }
            catch { }
            return SystemIcons.Shield;
        }
    }

    // ─── ALERT FORM ───────────────────────────────────────────────────────────────
    public class AlertForm : Form
    {
        private Label alertLabel, messageLabel;
        private Button dismissButton;
        private System.Windows.Forms.Timer flashTimer;
        private bool isRed;

        public AlertForm()
        {
            this.FormBorderStyle = FormBorderStyle.None;
            this.WindowState = FormWindowState.Maximized;
            this.TopMost = true;
            this.ShowInTaskbar = true;
            this.ControlBox = false;
            this.BackColor = Color.Black;

            alertLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Top, Height = 150,
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Arial Black", 56, FontStyle.Bold),
                ForeColor = Color.White, BackColor = Color.Transparent, Visible = false
            };

            messageLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Fill,
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", 28, FontStyle.Regular),
                ForeColor = Color.White, BackColor = Color.Transparent,
                Padding = new Padding(60), Visible = false
            };

            dismissButton = new Button()
            {
                Text = "ACKNOWLEDGE & DISMISS", FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(220, Color.White), ForeColor = Color.Black,
                Font = new Font("Arial", 16, FontStyle.Bold), Size = new Size(350, 70),
                FlatAppearance = { BorderSize = 0 }, Visible = false, Cursor = Cursors.Hand
            };
            dismissButton.Click += (s, e) => Dismiss();

            var bottomPanel = new Panel() { Dock = DockStyle.Bottom, Height = 120, BackColor = Color.Transparent };
            dismissButton.Location = new Point(
                (Screen.PrimaryScreen.Bounds.Width - dismissButton.Width) / 2, 25);
            dismissButton.Anchor = AnchorStyles.None;
            bottomPanel.Controls.Add(dismissButton);

            this.Controls.Add(messageLabel);
            this.Controls.Add(alertLabel);
            this.Controls.Add(bottomPanel);

            flashTimer = new System.Windows.Forms.Timer { Interval = 600 };
            flashTimer.Tick += (s, e) =>
            {
                isRed = !isRed;
                var c = (Color[])this.Tag;
                this.BackColor = isRed ? c[0] : c[1];
                this.Refresh();
            };
        }

        public void ShowAlert(string alertType, string message, string rawType)
        {
            Color c1, c2;
            string icon;
            switch (rawType.ToLower())
            {
                case "lockdown": c1 = Color.FromArgb(220, 38, 38); c2 = Color.Black; icon = "\U0001f512"; break;
                case "fire":     c1 = Color.FromArgb(234, 88, 12); c2 = Color.FromArgb(220, 38, 38); icon = "\U0001f525"; break;
                case "weather":  c1 = Color.FromArgb(37, 99, 235); c2 = Color.FromArgb(29, 78, 216); icon = "\U0001f32a\ufe0f"; break;
                case "lockout":  c1 = Color.FromArgb(234, 88, 12); c2 = Color.Black; icon = "\U0001f6aa"; break;
                default:         c1 = Color.Red; c2 = Color.DarkRed; icon = "\u26a0\ufe0f"; break;
            }

            alertLabel.Text = $"{icon}  {alertType}";
            alertLabel.Visible = true;
            messageLabel.Text = message;
            messageLabel.Visible = true;
            dismissButton.Visible = true;
            dismissButton.BringToFront();

            isRed = true;
            this.BackColor = c1;
            this.Tag = new Color[] { c1, c2 };
            flashTimer.Start();

            // Play siren sound
            AlertSoundPlayer.PlaySiren();

            if (!this.Visible) this.Show();
            this.Activate();
            this.TopMost = true;
            this.BringToFront();
        }

        private void Dismiss()
        {
            flashTimer.Stop();
            AlertSoundPlayer.StopSiren();
            this.BackColor = Color.Black;
            alertLabel.Visible = false;
            messageLabel.Visible = false;
            dismissButton.Visible = false;
            this.Hide();
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == Keys.Escape) { Dismiss(); return true; }
            return base.ProcessCmdKey(ref msg, keyData);
        }
    }

    // ─── API MODEL ────────────────────────────────────────────────────────────────
    public class RasAlert
    {
        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; }
    }

    // ─── AUTO-UPDATE MODEL ────────────────────────────────────────────────────────
    public class UpdateInfo
    {
        [JsonPropertyName("version")]
        public string Version { get; set; }

        [JsonPropertyName("downloadUrl")]
        public string DownloadUrl { get; set; }
    }

    // ─── TRAY APPLICATION ─────────────────────────────────────────────────────────
    public class TrayApplication : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private AlertForm alertForm;
        private System.Windows.Forms.Timer pollTimer;
        private System.Windows.Forms.Timer updateTimer;
        private AppSettings settings;
        private bool hasActiveAlert = false;
        private bool settingsShowing = false;
        private static readonly Version CurrentVersion = new(1, 0, 0, 0);
        private static readonly string UpdateUrl = "https://staging.fivestonestechnology.com/api/ras/update/version.json";

        public TrayApplication()
        {
            // Load persisted settings
            settings = SettingsManager.Load();

            // Create alert form lazily (only when needed)
            alertForm = null;

            // Set up tray icon
            trayIcon = new NotifyIcon()
            {
                Icon = LoadTrayIcon(),
                Text = "Five Stones RAS - Monitoring",
                Visible = true
            };

            var menu = new ContextMenuStrip();
            menu.Items.Add("Status: Monitoring", null, (s, e) => { });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Settings...", null, (s, e) => ShowSettings());
            menu.Items.Add("Test Alert", null, (s, e) =>
            {
                if (!hasActiveAlert)
                    TriggerAlert("TEST ALERT", "This is a test alert.", "lockdown");
            });
            menu.Items.Add("Check for Updates", null, async (s, e) => await CheckForUpdates(true));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit", null, (s, e) =>
            {
                pollTimer?.Stop();
                updateTimer?.Stop();
                trayIcon.Visible = false;
                Application.Exit();
            });
            trayIcon.ContextMenuStrip = menu;
            trayIcon.DoubleClick += (s, e) => ShowSettings();

            // Apply auto-start setting from loaded settings
            SettingsManager.ApplyAutoStart(settings.AutoStart);

            // Show settings on first launch if not configured
            if (string.IsNullOrEmpty(settings.ApiKey) || settings.OrgId == 0)
            {
                var firstRunTimer = new System.Windows.Forms.Timer { Interval = 500 };
                firstRunTimer.Tick += (s, e) =>
                {
                    firstRunTimer.Stop();
                    ShowSettings();
                };
                firstRunTimer.Start();
            }
            else
            {
                trayIcon.Text = "Five Stones RAS - Connected";
                menu.Items[0].Text = "Status: Connected";
            }

            // Start polling for alerts (only if settings are configured)
            if (!string.IsNullOrEmpty(settings.ApiKey) && settings.OrgId != 0)
            {
                pollTimer = new System.Windows.Forms.Timer { Interval = 5000 };
                pollTimer.Tick += async (s, e) => await PollForAlert();
                pollTimer.Start();
            }

            // Start background update checker (check every 6 hours)
            updateTimer = new System.Windows.Forms.Timer { Interval = 6 * 60 * 60 * 1000 };
            updateTimer.Tick += async (s, e) => await CheckForUpdates(false);
            updateTimer.Start();

            // Check for updates on startup (silent)
            System.Windows.Forms.Timer startupUpdate = new() { Interval = 3000 };
            startupUpdate.Tick += async (s, e) =>
            {
                startupUpdate.Stop();
                await CheckForUpdates(false);
            };
            startupUpdate.Start();
        }

        private Icon LoadTrayIcon()
        {
            try
            {
                using var stream = Assembly.GetExecutingAssembly()
                    .GetManifestResourceStream("RasDesktopAlert.app.ico");
                if (stream != null)
                    return new Icon(stream, SystemInformation.SmallIconSize);
            }
            catch { }
            return SystemIcons.Shield;
        }

        private void ShowSettings()
        {
            if (settingsShowing) return;
            settingsShowing = true;

            var form = new SettingsForm()
            {
                ApiBaseUrl = settings.ApiBaseUrl,
                ApiKey = settings.ApiKey,
                OrgId = settings.OrgId,
                AutoStart = settings.AutoStart
            };

            if (form.ShowDialog() == DialogResult.OK)
            {
                settings.ApiBaseUrl = form.ApiBaseUrl;
                settings.ApiKey = form.ApiKey;
                settings.OrgId = form.OrgId;
                settings.AutoStart = form.AutoStart;

                SettingsManager.Save(settings);

                trayIcon.Text = "Five Stones RAS - Connected";
                trayIcon.ContextMenuStrip.Items[0].Text = "Status: Connected";

                // Restart poll timer with new settings
                pollTimer?.Stop();
                pollTimer = new System.Windows.Forms.Timer { Interval = 5000 };
                pollTimer.Tick += async (s, e) => await PollForAlert();
                pollTimer.Start();
            }

            settingsShowing = false;
        }

        private async Task PollForAlert()
        {
            if (string.IsNullOrEmpty(settings.ApiKey) || settings.OrgId == 0)
                return;

            try
            {
                using var client = new HttpClient();
                client.DefaultRequestHeaders.Add("X-Api-Key", settings.ApiKey);
                client.Timeout = TimeSpan.FromSeconds(5);

                var response = await client
                    .GetAsync($"{settings.ApiBaseUrl}/api/ras/alerts/active?orgId={settings.OrgId}");

                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var alert = JsonSerializer.Deserialize<RasAlert>(json,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    if (alert != null && alert.Status != "resolved" && !hasActiveAlert)
                    {
                        hasActiveAlert = true;
                        TriggerAlert(alert.Type?.ToUpper() ?? "ALERT",
                                     alert.Message ?? "Alert activated",
                                     alert.Type ?? "general");
                    }
                    else if (alert == null || alert.Status == "resolved")
                    {
                        if (hasActiveAlert)
                        {
                            hasActiveAlert = false;
                            if (alertForm != null && !alertForm.IsDisposed)
                            {
                                alertForm.Invoke((System.Windows.Forms.MethodInvoker)(() => alertForm.Hide()));
                            }
                            trayIcon.Text = "Five Stones RAS - Monitoring";
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Poll error: {ex.Message}");
            }
        }

        private void TriggerAlert(string alertType, string message, string rawType)
        {
            if (alertForm == null || alertForm.IsDisposed)
            {
                alertForm = new AlertForm();
            }

            alertForm.ShowAlert(alertType, message, rawType);
            trayIcon.Text = $"\u26a0\ufe0f ALERT: {alertType}";
            trayIcon.ShowBalloonTip(15000, "\u26a0\ufe0f EMERGENCY ALERT",
                $"{alertType}: {message}", ToolTipIcon.Warning);
        }

        // ─── AUTO-UPDATE ──────────────────────────────────────────────────────────
        private async Task CheckForUpdates(bool userInitiated)
        {
            try
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var response = await client.GetAsync(UpdateUrl);
                if (!response.IsSuccessStatusCode) return;

                var json = await response.Content.ReadAsStringAsync();
                var update = JsonSerializer.Deserialize<UpdateInfo>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (update == null || string.IsNullOrEmpty(update.Version))
                    return;

                if (!Version.TryParse(update.Version, out var latestVersion))
                    return;

                if (latestVersion <= CurrentVersion)
                {
                    if (userInitiated)
                    {
                        MessageBox.Show("You're running the latest version.",
                            "No Update Available", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    return;
                }

                var result = MessageBox.Show(
                    $"A new version ({update.Version}) is available.\n\nDownload and install now?",
                    "Update Available",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question);

                if (result == DialogResult.Yes && !string.IsNullOrEmpty(update.DownloadUrl))
                {
                    var tempDir = Path.Combine(Path.GetTempPath(), "FiveStonesRASUpdate");
                    Directory.CreateDirectory(tempDir);
                    var installerPath = Path.Combine(tempDir, "FiveStonesRASAlert-Setup.exe");

                    using (var dlClient = new HttpClient())
                    {
                        dlClient.Timeout = TimeSpan.FromMinutes(5);
                        var dlBytes = await dlClient.GetByteArrayAsync(update.DownloadUrl);
                        await File.WriteAllBytesAsync(installerPath, dlBytes);
                    }

                    Process.Start(new ProcessStartInfo()
                    {
                        FileName = installerPath,
                        UseShellExecute = true,
                        Verb = "runas"
                    });

                    pollTimer?.Stop();
                    updateTimer?.Stop();
                    trayIcon.Visible = false;
                    Application.Exit();
                }
            }
            catch (Exception ex)
            {
                if (userInitiated)
                {
                    MessageBox.Show($"Failed to check for updates: {ex.Message}",
                        "Update Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
                System.Diagnostics.Debug.WriteLine($"Update check error: {ex.Message}");
            }
        }
    }
}