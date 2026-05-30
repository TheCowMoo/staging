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
            Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Handle command-line arguments (used by installer/uninstaller)
            var args = Environment.GetCommandLineArgs();
            if (args.Length > 1)
            {
                switch (args[1].ToLowerInvariant())
                {
                    case "--close":
                        var current = Process.GetCurrentProcess();
                        foreach (var proc in Process.GetProcessesByName(current.ProcessName))
                            if (proc.Id != current.Id) { proc.Kill(); proc.WaitForExit(3000); }
                        return;
                    case "--uninstall":
                        SettingsManager.EnsureDirectoryExists();
                        SettingsManager.ApplyAutoStart(false);
                        return;
                }
            }
            Application.Run(new TrayApplication());
        }
    }

    // ─── BRAND COLORS ─────────────────────────────────────────────────────────────
    public static class BrandColors
    {
        public static readonly Color Navy = Color.FromArgb(11, 31, 51);
        public static readonly Color Steel = Color.FromArgb(58, 95, 125);
        public static readonly Color Gold = Color.FromArgb(201, 168, 106);
        public static readonly Color Surface = Color.FromArgb(217, 226, 236);
        public static readonly Color White = Color.White;
        public static readonly Color AlertRed = Color.FromArgb(220, 38, 38);
        public static readonly Color AlertOrange = Color.FromArgb(234, 88, 12);
        public static readonly Color AlertBlue = Color.FromArgb(37, 99, 235);
    }

    // ─── SETTINGS MODEL ───────────────────────────────────────────────────────────
    public class AppSettings
    {
        [JsonPropertyName("apiBaseUrl")]  public string ApiBaseUrl { get; set; } = "https://staging.fivestonestechnology.com";
        [JsonPropertyName("apiKey")]      public string ApiKey { get; set; } = "";
        [JsonPropertyName("orgId")]       public int OrgId { get; set; } = 0;
        [JsonPropertyName("autoStart")]   public bool AutoStart { get; set; } = false;
    }

    // ─── SETTINGS MANAGER ─────────────────────────────────────────────────────────
    public static class SettingsManager
    {
        private static readonly string AppDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "FiveStones", "RAS Alert");
        private static readonly string SettingsPath = Path.Combine(AppDir, "ras_settings.json");
        private static readonly string LogPath = Path.Combine(AppDir, "ras_error.log");
        private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = true, PropertyNameCaseInsensitive = true };

        public static void EnsureDirectoryExists() { try { Directory.CreateDirectory(AppDir); } catch { } }

        public static AppSettings Load()
        {
            EnsureDirectoryExists();
            try { if (File.Exists(SettingsPath)) return JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(SettingsPath), JsonOpts) ?? new(); }
            catch (Exception ex) { Log($"Failed to load: {ex.Message}"); }
            return new AppSettings();
        }

        public static void Save(AppSettings settings)
        {
            EnsureDirectoryExists();
            try { File.WriteAllText(SettingsPath, JsonSerializer.Serialize(settings, JsonOpts)); ApplyAutoStart(settings.AutoStart); }
            catch (Exception ex) { Log($"Failed to save: {ex.Message}"); }
        }

        public static void ApplyAutoStart(bool enable)
        {
            try
            {
                using var key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", writable: true);
                if (enable) key.SetValue("FiveStonesRASAlert", $"\"{Application.ExecutablePath}\"");
                else { if (key.GetValue("FiveStonesRASAlert") != null) key.DeleteValue("FiveStonesRASAlert"); }
            }
            catch (Exception ex) { Log($"Auto-start: {ex.Message}"); }
        }

        public static void Log(string message)
        {
            try { EnsureDirectoryExists(); File.AppendAllText(LogPath, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} - {message}{Environment.NewLine}"); } catch { }
        }
    }

    // ─── ALERT SOUND PLAYER ───────────────────────────────────────────────────────
    public static class AlertSoundPlayer
    {
        private static SoundPlayer _player;

        public static void PlaySiren()
        {
            try { StopSiren(); _player = GenerateSirenSound(); _player.PlayLooping(); }
            catch (Exception ex) { Debug.WriteLine($"Siren error: {ex.Message}"); }
        }

        public static void StopSiren()
        {
            if (_player != null) try { _player.Stop(); _player.Dispose(); } catch { }
            _player = null;
        }

        private static SoundPlayer GenerateSirenSound()
        {
            int sampleRate = 22050, durationMs = 3000, numSamples = sampleRate * durationMs / 1000;
            short[] samples = new short[numSamples];
            double freq1 = 600, freq2 = 900, cycleMs = 500;
            for (int i = 0; i < numSamples; i++)
            {
                double t = (double)i / sampleRate, elapsedMs = t * 1000;
                double freq = ((int)(elapsedMs / cycleMs) % 2 == 0) ? freq1 : freq2;
                double sin = Math.Sin(2.0 * Math.PI * freq * t);
                double envelope = 1.0;
                if (elapsedMs < 50) envelope = elapsedMs / 50.0;
                if (elapsedMs > durationMs - 50) envelope = (durationMs - elapsedMs) / 50.0;
                samples[i] = (short)(sin * envelope * 16000);
            }
            int dataSize = numSamples * 2, fileSize = 44 + dataSize;
            using var ms = new MemoryStream(fileSize);
            using var bw = new BinaryWriter(ms);
            bw.Write(new char[] { 'R', 'I', 'F', 'F' }); bw.Write(fileSize - 8);
            bw.Write(new char[] { 'W', 'A', 'V', 'E' });
            bw.Write(new char[] { 'f', 'm', 't', ' ' }); bw.Write(16);
            bw.Write((short)1); bw.Write((short)1); bw.Write(sampleRate); bw.Write(sampleRate * 2);
            bw.Write((short)2); bw.Write((short)16);
            bw.Write(new char[] { 'd', 'a', 't', 'a' }); bw.Write(dataSize);
            foreach (short s in samples) bw.Write(s);
            bw.Flush(); ms.Position = 0;
            return new SoundPlayer(ms);
        }
    }

    // ─── SETTINGS FORM ────────────────────────────────────────────────────────────
    public class SettingsForm : Form
    {
        private TextBox apiUrlBox, apiKeyBox;
        private NumericUpDown orgIdBox;
        private CheckBox autoStartCheck;

        public string ApiBaseUrl { get => apiUrlBox.Text.Trim(); set => apiUrlBox.Text = value; }
        public string ApiKey { get => apiKeyBox.Text.Trim(); set => apiKeyBox.Text = value; }
        public int OrgId { get => (int)orgIdBox.Value; set => orgIdBox.Value = Math.Max(orgIdBox.Minimum, Math.Min(orgIdBox.Maximum, value)); }
        public bool AutoStart { get => autoStartCheck.Checked; set => autoStartCheck.Checked = value; }

        public SettingsForm()
        {
            this.Text = "Five Stones RAS Alert — Settings";
            this.Size = new Size(520, 380);
            this.MinimumSize = this.Size;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Icon = LoadAppIcon();
            this.BackColor = BrandColors.White;

            // Brand header with logo
            var headerPanel = new Panel() { Dock = DockStyle.Top, Height = 56, BackColor = BrandColors.Navy };
            var headerLogo = new PictureBox()
            {
                Image = LoadLogoImage(),
                SizeMode = PictureBoxSizeMode.Zoom,
                Width = 160, Height = 36,
                BackColor = Color.Transparent,
                Location = new Point(10, 10)
            };
            headerPanel.Controls.Add(headerLogo);

            // Main content
            var mainPanel = new TableLayoutPanel()
            {
                Dock = DockStyle.Fill,
                Padding = new Padding(20, 10, 20, 10),
                ColumnCount = 2, RowCount = 5,
                ColumnStyles = { new ColumnStyle(SizeType.Absolute, 100), new ColumnStyle(SizeType.Percent, 100) },
                RowStyles = {
                    new RowStyle(SizeType.Absolute, 38),
                    new RowStyle(SizeType.Absolute, 38),
                    new RowStyle(SizeType.Absolute, 38),
                    new RowStyle(SizeType.Absolute, 38),
                    new RowStyle(SizeType.Absolute, 50)
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

            var buttonPanel = new FlowLayoutPanel() { Dock = DockStyle.Fill, FlowDirection = FlowDirection.RightToLeft, Margin = new Padding(0, 8, 0, 0) };
            var saveBtn = new Button()
            {
                Text = "Save & Connect", Size = new Size(130, 34), Font = new Font("Segoe UI", 10, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat, BackColor = BrandColors.Navy, ForeColor = BrandColors.White,
                FlatAppearance = { BorderSize = 0 }, Cursor = Cursors.Hand
            };
            saveBtn.Click += (s, e) =>
            {
                if (string.IsNullOrWhiteSpace(apiUrlBox.Text) || string.IsNullOrWhiteSpace(apiKeyBox.Text))
                { MessageBox.Show("Please fill all fields.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
                DialogResult = DialogResult.OK; Close();
            };
            var cancelBtn = new Button() { Text = "Cancel", Size = new Size(100, 34), Font = new Font("Segoe UI", 10), Cursor = Cursors.Hand };
            cancelBtn.Click += (s, e) => { DialogResult = DialogResult.Cancel; Close(); };
            buttonPanel.Controls.Add(saveBtn); buttonPanel.Controls.Add(cancelBtn);
            mainPanel.Controls.Add(buttonPanel, 1, 4);

            this.Controls.Add(headerPanel);
            this.Controls.Add(mainPanel);
            this.Controls.Add(new Label()
            {
                Text = "Get API key from Dashboard > Admin > API Keys.",
                Dock = DockStyle.Bottom, TextAlign = ContentAlignment.MiddleLeft,
                Font = new Font("Segoe UI", 8, FontStyle.Italic), ForeColor = BrandColors.Steel,
                Height = 24, Padding = new Padding(16, 0, 0, 0)
            });
            this.AcceptButton = saveBtn;
            this.CancelButton = cancelBtn;
        }

        private static Icon LoadAppIcon()
        {
            try { using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("RasDesktopAlert.app.ico"); if (s != null) return new Icon(s); } catch { }
            return SystemIcons.Shield;
        }

        private static Image LoadLogoImage()
        {
            try { using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("RasDesktopAlert.logo.png"); if (s != null) return Image.FromStream(s); } catch { }
            return null;
        }
    }

    // ─── ALERT FORM ───────────────────────────────────────────────────────────────
    public class AlertForm : Form
    {
        private Label alertLabel, messageLabel;
        private Button dismissButton;
        private Panel brandedHeader;
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

            // Branded header
            brandedHeader = new Panel() { Height = 44, Dock = DockStyle.Top, BackColor = BrandColors.Navy, Visible = false };
            var brandLabel = new Label()
            {
                Text = "  Five Stones Technology  —  Response Activation System",
                Font = new Font("Segoe UI", 11, FontStyle.Bold), ForeColor = BrandColors.Gold,
                Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Padding = new Padding(10, 0, 0, 0)
            };
            brandedHeader.Controls.Add(brandLabel);

            alertLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Top, Height = 130,
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Arial Black", 52, FontStyle.Bold),
                ForeColor = Color.White, BackColor = Color.Transparent, Visible = false
            };

            messageLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", 26, FontStyle.Regular), ForeColor = Color.White,
                BackColor = Color.Transparent, Padding = new Padding(60), Visible = false
            };

            dismissButton = new Button()
            {
                Text = "ACKNOWLEDGE & DISMISS", FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(220, Color.White), ForeColor = Color.Black,
                Font = new Font("Segoe UI", 16, FontStyle.Bold), Size = new Size(340, 66),
                FlatAppearance = { BorderSize = 0 }, Visible = false, Cursor = Cursors.Hand
            };
            dismissButton.Click += (s, e) => Dismiss();

            var bottomPanel = new Panel() { Dock = DockStyle.Bottom, Height = 100, BackColor = Color.Transparent };

            this.Controls.Add(messageLabel);
            this.Controls.Add(alertLabel);
            this.Controls.Add(brandedHeader);
            this.Controls.Add(bottomPanel);

            flashTimer = new System.Windows.Forms.Timer { Interval = 600 };
            flashTimer.Tick += (s, e) => { isRed = !isRed; var c = (Color[])this.Tag; this.BackColor = isRed ? c[0] : c[1]; this.Refresh(); };

            this.Resize += (s, e) => CenterButton(bottomPanel);
        }

        private void CenterButton(Panel bp)
        {
            if (dismissButton.Parent == null) return;
            dismissButton.Location = new Point((this.ClientSize.Width - dismissButton.Width) / 2, (bp.Height - dismissButton.Height) / 2);
        }

        public void ShowAlert(string alertType, string message, string rawType)
        {
            Color c1, c2; string icon;
            switch (rawType.ToLower())
            {
                case "lockdown": c1 = BrandColors.AlertRed; c2 = Color.Black; icon = "\U0001f512"; break;
                case "fire":     c1 = BrandColors.AlertOrange; c2 = BrandColors.AlertRed; icon = "\U0001f525"; break;
                case "weather":  c1 = BrandColors.AlertBlue; c2 = Color.FromArgb(29, 78, 216); icon = "\U0001f32a\ufe0f"; break;
                case "lockout":  c1 = BrandColors.AlertOrange; c2 = Color.Black; icon = "\U0001f6aa"; break;
                default:         c1 = Color.Red; c2 = Color.DarkRed; icon = "\u26a0\ufe0f"; break;
            }
            brandedHeader.Visible = true; brandedHeader.BringToFront();
            alertLabel.Text = $"{icon}  {alertType}"; alertLabel.Visible = true;
            messageLabel.Text = message; messageLabel.Visible = true;
            dismissButton.Visible = true; dismissButton.BringToFront();
            isRed = true; this.BackColor = c1; this.Tag = new Color[] { c1, c2 };
            flashTimer.Start();
            AlertSoundPlayer.PlaySiren();
            if (!this.Visible) this.Show();
            this.Activate(); this.TopMost = true; this.BringToFront();
        }

        private void Dismiss()
        {
            flashTimer.Stop(); AlertSoundPlayer.StopSiren();
            this.BackColor = Color.Black; brandedHeader.Visible = false;
            alertLabel.Visible = false; messageLabel.Visible = false; dismissButton.Visible = false;
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
        [JsonPropertyName("type")]    public string Type { get; set; }
        [JsonPropertyName("message")] public string Message { get; set; }
        [JsonPropertyName("status")]  public string Status { get; set; }
    }

    public class UpdateInfo
    {
        [JsonPropertyName("version")]     public string Version { get; set; }
        [JsonPropertyName("downloadUrl")] public string DownloadUrl { get; set; }
    }

    // ─── TRAY APPLICATION ─────────────────────────────────────────────────────────
    public class TrayApplication : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private AlertForm alertForm;
        private System.Windows.Forms.Timer pollTimer, updateTimer;
        private AppSettings settings;
        private bool hasActiveAlert = false, settingsShowing = false;
        private static readonly Version CurrentVersion = new(1, 0, 0, 0);
        private static readonly string UpdateUrl = "https://staging.fivestonestechnology.com/api/ras/update/version.json";

        public TrayApplication()
        {
            settings = SettingsManager.Load();
            trayIcon = new NotifyIcon() { Icon = LoadTrayIcon(), Text = "Five Stones RAS - Monitoring", Visible = true };
            var menu = new ContextMenuStrip();
            menu.Items.Add("Status: Monitoring", null, (s, e) => { });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Settings...", null, (s, e) => ShowSettings());
            menu.Items.Add("Test Alert", null, (s, e) => { if (!hasActiveAlert) TriggerAlert("TEST ALERT", "Test alert.", "lockdown"); });
            menu.Items.Add("Check for Updates", null, async (s, e) => await CheckForUpdates(true));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit", null, (s, e) => { pollTimer?.Stop(); updateTimer?.Stop(); trayIcon.Visible = false; Application.Exit(); });
            trayIcon.ContextMenuStrip = menu;
            trayIcon.DoubleClick += (s, e) => ShowSettings();

            SettingsManager.ApplyAutoStart(settings.AutoStart);

            if (string.IsNullOrEmpty(settings.ApiKey) || settings.OrgId == 0)
            {
                var t = new System.Windows.Forms.Timer { Interval = 500 };
                t.Tick += (s, e) => { t.Stop(); ShowSettings(); };
                t.Start();
            }
            else { trayIcon.Text = "Five Stones RAS - Connected"; menu.Items[0].Text = "Status: Connected"; }

            if (!string.IsNullOrEmpty(settings.ApiKey) && settings.OrgId != 0)
            {
                pollTimer = new System.Windows.Forms.Timer { Interval = 5000 };
                pollTimer.Tick += async (s, e) => await PollForAlert();
                pollTimer.Start();
            }

            updateTimer = new System.Windows.Forms.Timer { Interval = 6 * 60 * 60 * 1000 };
            updateTimer.Tick += async (s, e) => await CheckForUpdates(false);
            updateTimer.Start();
            var su = new System.Windows.Forms.Timer { Interval = 3000 };
            su.Tick += async (s, e) => { su.Stop(); await CheckForUpdates(false); };
            su.Start();
        }

        private Icon LoadTrayIcon()
        {
            try { using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("RasDesktopAlert.app.ico"); if (s != null) return new Icon(s, SystemInformation.SmallIconSize); } catch { }
            return SystemIcons.Shield;
        }

        private void ShowSettings()
        {
            if (settingsShowing) return;
            settingsShowing = true;
            var f = new SettingsForm() { ApiBaseUrl = settings.ApiBaseUrl, ApiKey = settings.ApiKey, OrgId = settings.OrgId, AutoStart = settings.AutoStart };
            if (f.ShowDialog() == DialogResult.OK)
            {
                settings.ApiBaseUrl = f.ApiBaseUrl; settings.ApiKey = f.ApiKey; settings.OrgId = f.OrgId; settings.AutoStart = f.AutoStart;
                SettingsManager.Save(settings);
                trayIcon.Text = "Five Stones RAS - Connected";
                trayIcon.ContextMenuStrip.Items[0].Text = "Status: Connected";
                pollTimer?.Stop();
                pollTimer = new System.Windows.Forms.Timer { Interval = 5000 };
                pollTimer.Tick += async (s, e) => await PollForAlert();
                pollTimer.Start();
            }
            settingsShowing = false;
        }

        private async Task PollForAlert()
        {
            if (string.IsNullOrEmpty(settings.ApiKey) || settings.OrgId == 0) return;
            try
            {
                using var c = new HttpClient();
                c.DefaultRequestHeaders.Add("X-Api-Key", settings.ApiKey);
                c.Timeout = TimeSpan.FromSeconds(5);
                var r = await c.GetAsync($"{settings.ApiBaseUrl}/api/ras/alerts/active?orgId={settings.OrgId}");
                if (r.IsSuccessStatusCode)
                {
                    var j = await r.Content.ReadAsStringAsync();
                    var a = JsonSerializer.Deserialize<RasAlert>(j, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (a != null && a.Status != "resolved" && !hasActiveAlert)
                    { hasActiveAlert = true; TriggerAlert(a.Type?.ToUpper() ?? "ALERT", a.Message ?? "Alert activated", a.Type ?? "general"); }
                    else if (a == null || a.Status == "resolved" && hasActiveAlert)
                    { hasActiveAlert = false; alertForm?.Invoke((System.Windows.Forms.MethodInvoker)(() => alertForm.Hide())); trayIcon.Text = "Five Stones RAS - Monitoring"; }
                }
            }
            catch { }
        }

        private void TriggerAlert(string alertType, string message, string rawType)
        {
            if (alertForm == null || alertForm.IsDisposed) alertForm = new AlertForm();
            alertForm.ShowAlert(alertType, message, rawType);
            trayIcon.Text = $"\u26a0\ufe0f ALERT: {alertType}";
            trayIcon.ShowBalloonTip(15000, "\u26a0\ufe0f EMERGENCY ALERT", $"{alertType}: {message}", ToolTipIcon.Warning);
        }

        private async Task CheckForUpdates(bool userInitiated)
        {
            try
            {
                using var c = new HttpClient(); c.Timeout = TimeSpan.FromSeconds(10);
                var r = await c.GetAsync(UpdateUrl); if (!r.IsSuccessStatusCode) return;
                var j = await r.Content.ReadAsStringAsync();
                var u = JsonSerializer.Deserialize<UpdateInfo>(j, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (u == null || string.IsNullOrEmpty(u.Version) || !Version.TryParse(u.Version, out var lv)) return;
                if (lv <= CurrentVersion) { if (userInitiated) MessageBox.Show("Latest version.", "No Update", MessageBoxButtons.OK, MessageBoxIcon.Information); return; }
                if (MessageBox.Show($"Version {u.Version} available. Install now?", "Update", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes && !string.IsNullOrEmpty(u.DownloadUrl))
                {
                    var t = Path.Combine(Path.GetTempPath(), "FiveStonesRASUpdate"); Directory.CreateDirectory(t);
                    var p = Path.Combine(t, "FiveStonesRASAlert-Setup.exe");
                    using var d = new HttpClient(); d.Timeout = TimeSpan.FromMinutes(5);
                    await File.WriteAllBytesAsync(p, await d.GetByteArrayAsync(u.DownloadUrl));
                    Process.Start(new ProcessStartInfo() { FileName = p, UseShellExecute = true, Verb = "runas" });
                    pollTimer?.Stop(); updateTimer?.Stop(); trayIcon.Visible = false; Application.Exit();
                }
            }
            catch (Exception ex) { if (userInitiated) MessageBox.Show($"Update check failed: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        }
    }
}