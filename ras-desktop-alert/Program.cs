using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net.Http;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
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
        public static readonly Color White = Color.White;
        public static readonly Color LightBg = Color.FromArgb(244, 246, 248);
        public static readonly Color Border = Color.FromArgb(208, 213, 221);
        public static readonly Color TextMuted = Color.FromArgb(90, 101, 112);
        public static readonly Color AlertRed = Color.FromArgb(220, 38, 38);
        public static readonly Color AlertOrange = Color.FromArgb(234, 88, 12);
        public static readonly Color AlertBlue = Color.FromArgb(37, 99, 235);
        public static readonly Color Success = Color.FromArgb(22, 163, 74);
        public static readonly Color Danger = Color.FromArgb(220, 38, 38);
    }

    // ─── MP3 ALARM PLAYER ────────────────────────────────────────────────────────
    public static class AlarmPlayer
    {
        private static string _tempFile;
        private static bool _initialized;

        [DllImport("winmm.dll", CharSet = CharSet.Auto)]
        private static extern int mciSendString(string command, StringBuilder buffer, int bufferSize, IntPtr hwndCallback);

        public static void Initialize()
        {
            if (_initialized) return;
            try
            {
                using var stream = Assembly.GetExecutingAssembly()
                    .GetManifestResourceStream("RasDesktopAlert.alarm.mp3");
                if (stream != null)
                {
                    _tempFile = Path.Combine(Path.GetTempPath(), "fivestones_alarm.mp3");
                    using var fs = new FileStream(_tempFile, FileMode.Create, FileAccess.Write);
                    stream.CopyTo(fs); fs.Flush();
                }
                _initialized = true;
            }
            catch (Exception ex) { Debug.WriteLine($"Alarm init: {ex.Message}"); }
        }

        public static void PlayAlarm()
        {
            StopAlarm();
            if (!_initialized) Initialize();
            if (!string.IsNullOrEmpty(_tempFile) && File.Exists(_tempFile))
            {
                mciSendString($"open \"{_tempFile}\" type mpegvideo alias alarm", null, 0, IntPtr.Zero);
                mciSendString("play alarm repeat", null, 0, IntPtr.Zero);
            }
        }

        public static void StopAlarm()
        {
            mciSendString("stop alarm", null, 0, IntPtr.Zero);
            mciSendString("close alarm", null, 0, IntPtr.Zero);
        }

        public static void Cleanup() { StopAlarm(); try { if (_tempFile != null && File.Exists(_tempFile)) File.Delete(_tempFile); } catch { } }
    }

    // ─── SETTINGS MODEL ───────────────────────────────────────────────────────────
    public class AppSettings
    {
        [JsonPropertyName("apiBaseUrl")] public string ApiBaseUrl { get; set; } = "https://staging.fivestonestechnology.com";
        [JsonPropertyName("apiKey")]     public string ApiKey { get; set; } = "";
        [JsonPropertyName("orgId")]      public int OrgId { get; set; } = 0;
        [JsonPropertyName("autoStart")]  public bool AutoStart { get; set; } = false;
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
            catch (Exception ex) { Log($"Load: {ex.Message}"); }
            return new AppSettings();
        }
        public static void Save(AppSettings settings)
        {
            EnsureDirectoryExists();
            try { File.WriteAllText(SettingsPath, JsonSerializer.Serialize(settings, JsonOpts)); ApplyAutoStart(settings.AutoStart); }
            catch (Exception ex) { Log($"Save: {ex.Message}"); }
        }
        public static void ApplyAutoStart(bool enable)
        {
            try
            {
                using var key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", writable: true);
                if (enable) key.SetValue("FiveStonesRASAlert", $"\"{Application.ExecutablePath}\"");
                else { if (key.GetValue("FiveStonesRASAlert") != null) key.DeleteValue("FiveStonesRASAlert"); }
            }
            catch { }
        }
        public static void Log(string m)
        {
            try { EnsureDirectoryExists(); File.AppendAllText(LogPath, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} - {m}{Environment.NewLine}"); } catch { }
        }
    }

    // ─── ROUNDED BUTTON HELPER ────────────────────────────────────────────────────
    public class RoundButton : Button
    {
        private int _r = 6;
        public RoundButton() { FlatStyle = FlatStyle.Flat; FlatAppearance.BorderSize = 0; }
        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using var path = new GraphicsPath();
            path.AddArc(new Rectangle(0, 0, _r, _r), 180, 90);
            path.AddArc(new Rectangle(Width - _r - 1, 0, _r, _r), 270, 90);
            path.AddArc(new Rectangle(Width - _r - 1, Height - _r - 1, _r, _r), 0, 90);
            path.AddArc(new Rectangle(0, Height - _r - 1, _r, _r), 90, 90);
            path.CloseFigure();
            this.Region = new Region(path);
            using var sb = new SolidBrush(BackColor);
            e.Graphics.FillPath(sb, path);
            TextRenderer.DrawText(e.Graphics, Text, Font, ClientRectangle, ForeColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }
    }

    // ─── SETTINGS FORM ────────────────────────────────────────────────────────────
    public class SettingsForm : Form
    {
        private TextBox apiUrlBox, apiKeyBox;
        private NumericUpDown orgIdBox;
        private CheckBox autoStartCheck;
        private RoundButton testBtn, saveBtn, cancelBtn;
        private Label statusLabel;
        private bool testing = false;

        public string ApiBaseUrl { get => apiUrlBox.Text.Trim(); set => apiUrlBox.Text = value; }
        public string ApiKey { get => apiKeyBox.Text.Trim(); set => apiKeyBox.Text = value; }
        public int OrgId { get => (int)orgIdBox.Value; set => orgIdBox.Value = Math.Max(orgIdBox.Minimum, Math.Min(orgIdBox.Maximum, value)); }
        public bool AutoStart { get => autoStartCheck.Checked; set => autoStartCheck.Checked = value; }

        public SettingsForm()
        {
            this.Text = "Five Stones RAS Alert";
            this.Size = new Size(620, 480);
            this.MinimumSize = new Size(560, 420);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Icon = LoadAppIcon();
            this.BackColor = BrandColors.White;
            this.Padding = new Padding(0);
            this.Font = new Font("Segoe UI", 10);

            // ── HEADER ──
            var header = new Panel() { Height = 72, Dock = DockStyle.Top, BackColor = BrandColors.Navy };
            var logo = new PictureBox()
            {
                Image = LoadLogoImage(), SizeMode = PictureBoxSizeMode.Zoom,
                Width = 200, Height = 46, BackColor = Color.Transparent,
                Location = new Point(16, 13)
            };
            header.Controls.Add(logo);
            var hdrSub = new Label()
            {
                Text = "Desktop Alert Monitor", Font = new Font("Segoe UI", 11, FontStyle.Regular),
                ForeColor = BrandColors.Gold, BackColor = Color.Transparent,
                Location = new Point(230, 26), AutoSize = true
            };
            header.Controls.Add(hdrSub);

            // ── BODY (manual layout, precise positioning) ──
            var body = new Panel() { Dock = DockStyle.Fill, Padding = new Padding(28, 20, 28, 12) };

            int xLabel = 0, xInput = 110, y = 0, rh = 40;

            // Row 0: API URL
            var lbl0 = new Label() { Text = "API URL", Location = new Point(xLabel, y + 10), Size = new Size(100, 20),
                Font = new Font("Segoe UI", 10, FontStyle.SemiBold), ForeColor = BrandColors.TextMuted };
            apiUrlBox = new TextBox() { Location = new Point(xInput, y), Size = new Size(460, 28),
                Text = "https://staging.fivestonestechnology.com", Font = new Font("Segoe UI", 10),
                BorderStyle = BorderStyle.FixedSingle };
            body.Controls.Add(lbl0); body.Controls.Add(apiUrlBox);
            y += rh;

            // Row 1: API Key
            var lbl1 = new Label() { Text = "API Key", Location = new Point(xLabel, y + 10), Size = new Size(100, 20),
                Font = new Font("Segoe UI", 10, FontStyle.SemiBold), ForeColor = BrandColors.TextMuted };
            apiKeyBox = new TextBox() { Location = new Point(xInput, y), Size = new Size(460, 28),
                PasswordChar = '*', Font = new Font("Segoe UI", 10), BorderStyle = BorderStyle.FixedSingle };
            body.Controls.Add(lbl1); body.Controls.Add(apiKeyBox);
            y += rh;

            // Row 2: Org ID
            var lbl2 = new Label() { Text = "Org ID", Location = new Point(xLabel, y + 10), Size = new Size(100, 20),
                Font = new Font("Segoe UI", 10, FontStyle.SemiBold), ForeColor = BrandColors.TextMuted };
            orgIdBox = new NumericUpDown() { Location = new Point(xInput, y), Size = new Size(160, 28),
                Minimum = 0, Maximum = 999999, Font = new Font("Segoe UI", 10) };
            body.Controls.Add(lbl2); body.Controls.Add(orgIdBox);
            y += rh;

            // Row 3: Auto-start checkbox
            autoStartCheck = new CheckBox() { Text = " Launch at Windows startup", Location = new Point(xInput, y + 4),
                Font = new Font("Segoe UI", 10), AutoSize = true, ForeColor = BrandColors.TextMuted };
            body.Controls.Add(autoStartCheck);
            y += rh + 4;

            // Separator
            var sep = new Panel() { Location = new Point(0, y), Width = body.Width, Height = 1,
                BackColor = BrandColors.Border, Anchor = AnchorStyles.Left | AnchorStyles.Right };
            body.Controls.Add(sep);
            y += 16;

            // Row 4: Test Connection
            testBtn = new RoundButton()
            {
                Text = "Test Connection", Location = new Point(xInput, y), Size = new Size(150, 36),
                BackColor = BrandColors.Success, ForeColor = BrandColors.White,
                Font = new Font("Segoe UI", 10, FontStyle.Bold), Cursor = Cursors.Hand
            };
            testBtn.Click += async (s, e) => await TestConnection();
            body.Controls.Add(testBtn);

            statusLabel = new Label()
            {
                Text = "", Location = new Point(xInput + 162, y + 6), AutoSize = true,
                Font = new Font("Segoe UI", 9), ForeColor = BrandColors.TextMuted, MaximumSize = new Size(300, 40)
            };
            body.Controls.Add(statusLabel);
            y += 50;

            // Row 5: Save / Cancel
            saveBtn = new RoundButton()
            {
                Text = "Save && Connect", Location = new Point(320, y), Size = new Size(130, 36),
                BackColor = BrandColors.Navy, ForeColor = BrandColors.White,
                Font = new Font("Segoe UI", 10, FontStyle.Bold), Cursor = Cursors.Hand
            };
            saveBtn.Click += (s, e) =>
            {
                if (string.IsNullOrWhiteSpace(apiUrlBox.Text) || string.IsNullOrWhiteSpace(apiKeyBox.Text))
                { MessageBox.Show("Please fill all fields.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
                DialogResult = DialogResult.OK; Close();
            };
            cancelBtn = new RoundButton()
            {
                Text = "Cancel", Location = new Point(460, y), Size = new Size(100, 36),
                BackColor = Color.FromArgb(100, 116, 139), ForeColor = BrandColors.White,
                Font = new Font("Segoe UI", 10), Cursor = Cursors.Hand
            };
            cancelBtn.Click += (s, e) => { DialogResult = DialogResult.Cancel; Close(); };
            body.Controls.Add(saveBtn); body.Controls.Add(cancelBtn);
            this.AcceptButton = saveBtn; this.CancelButton = cancelBtn;

            // ── FOOTER ──
            var footer = new Panel() { Dock = DockStyle.Bottom, Height = 32, BackColor = BrandColors.LightBg };
            var fLabel = new Label()
            {
                Text = "  \u2139\ufe0f  Get API key from Dashboard \u2192 Admin \u2192 API Keys",
                Font = new Font("Segoe UI", 8, FontStyle.Italic), ForeColor = BrandColors.TextMuted,
                Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft
            };
            footer.Controls.Add(fLabel);

            this.Controls.Add(header);
            this.Controls.Add(body);
            this.Controls.Add(footer);
        }

        private async Task TestConnection()
        {
            if (testing) return;
            testing = true; testBtn.Enabled = false;
            statusLabel.ForeColor = BrandColors.TextMuted;
            statusLabel.Text = "Testing...";

            try
            {
                using var c = new HttpClient();
                c.DefaultRequestHeaders.Add("X-Api-Key", apiKeyBox.Text.Trim());
                c.Timeout = TimeSpan.FromSeconds(8);
                var r = await c.GetAsync($"{apiUrlBox.Text.Trim().TrimEnd('/')}/api/ras/alerts/active?orgId={(int)orgIdBox.Value}");

                if (r.IsSuccessStatusCode) { statusLabel.ForeColor = BrandColors.Success; statusLabel.Text = "\u2713 Connected! Alert polling works."; }
                else if (r.StatusCode == System.Net.HttpStatusCode.Unauthorized) { statusLabel.ForeColor = BrandColors.Danger; statusLabel.Text = "\u2717 Unauthorized \u2014 check your API key."; }
                else { statusLabel.ForeColor = BrandColors.Danger; statusLabel.Text = $"\u2717 Error {(int)r.StatusCode}"; }
            }
            catch (TaskCanceledException) { statusLabel.ForeColor = BrandColors.Danger; statusLabel.Text = "\u2717 Connection timed out."; }
            catch (HttpRequestException ex) { statusLabel.ForeColor = BrandColors.Danger; statusLabel.Text = $"\u2717 {ex.Message}"; }
            catch (Exception ex) { statusLabel.ForeColor = BrandColors.Danger; statusLabel.Text = $"\u2717 {ex.Message}"; }
            finally { testing = false; testBtn.Enabled = true; }
        }

        private static Icon LoadAppIcon()
        {
            try { using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("RasDesktopAlert.app.ico"); if (s != null) return new Icon(s); } catch { }
            return SystemIcons.Shield;
        }
        private static Image LoadLogoImage()
        {
            try { using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("RasDesktopAlert.logo.png"); if (s != null) return Image.FromStream(s); } catch { return null; }
        }
    }

    // ─── ALERT FORM ───────────────────────────────────────────────────────────────
    public class AlertForm : Form
    {
        private Label alertLabel, messageLabel;
        private RoundButton dismissButton;
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
            brandedHeader = new Panel() { Height = 52, Dock = DockStyle.Top, BackColor = BrandColors.Navy, Visible = false };
            var headerLogo = new PictureBox()
            {
                Image = LoadLogoImage(), SizeMode = PictureBoxSizeMode.Zoom,
                Width = 160, Height = 36, BackColor = Color.Transparent,
                Location = new Point(12, 8)
            };
            var brandLabel = new Label()
            {
                Text = "  Five Stones Technology  \u2014  Response Activation System",
                Font = new Font("Segoe UI", 13, FontStyle.Bold), ForeColor = BrandColors.Gold,
                Location = new Point(180, 12), AutoSize = true, BackColor = Color.Transparent
            };
            brandedHeader.Controls.Add(headerLogo);
            brandedHeader.Controls.Add(brandLabel);

            // Alert type text
            alertLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Top, Height = 160,
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Arial Black", 64, FontStyle.Bold),
                ForeColor = Color.White, BackColor = Color.Transparent, Visible = false
            };

            // Alert message
            messageLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", 30, FontStyle.Regular), ForeColor = Color.White,
                BackColor = Color.Transparent, Padding = new Padding(50, 0, 50, 40), Visible = false
            };

            // Dismiss button — ADDED TO BOTTOM PANEL (was never parented before!)
            dismissButton = new RoundButton()
            {
                Text = "ACKNOWLEDGE && DISMISS",
                Size = new Size(400, 72),
                BackColor = Color.FromArgb(230, Color.White),
                ForeColor = Color.FromArgb(30, 30, 30),
                Font = new Font("Segoe UI", 18, FontStyle.Bold),
                Visible = false, Cursor = Cursors.Hand
            };
            dismissButton.Click += (s, e) => Dismiss();

            var bottomPanel = new Panel() { Dock = DockStyle.Bottom, Height = 120, BackColor = Color.Transparent };
            dismissButton.Parent = bottomPanel; // FIXED: properly parent the button
            bottomPanel.Controls.Add(dismissButton);

            this.Controls.Add(messageLabel);
            this.Controls.Add(alertLabel);
            this.Controls.Add(brandedHeader);
            this.Controls.Add(bottomPanel);

            flashTimer = new System.Windows.Forms.Timer { Interval = 600 };
            flashTimer.Tick += (s, e) =>
            {
                isRed = !isRed;
                var c = (Color[])this.Tag;
                this.BackColor = isRed ? c[0] : c[1];
                this.Refresh();
            };

            this.Resize += (s, e) => CenterDismiss();
            // Initial center
            this.Load += (s, e) => CenterDismiss();
        }

        private void CenterDismiss()
        {
            if (dismissButton.Parent == null) return;
            dismissButton.Location = new Point(
                (this.ClientSize.Width - dismissButton.Width) / 2,
                (dismissButton.Parent.Height - dismissButton.Height) / 2);
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

            brandedHeader.Visible = true;
            brandedHeader.BringToFront();

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

            AlarmPlayer.PlayAlarm();

            if (!this.Visible) this.Show();
            this.Activate();
            this.TopMost = true;
            this.BringToFront();
            this.Focus();
            CenterDismiss();
        }

        private void Dismiss()
        {
            flashTimer.Stop(); AlarmPlayer.StopAlarm();
            this.BackColor = Color.Black; brandedHeader.Visible = false;
            alertLabel.Visible = false; messageLabel.Visible = false; dismissButton.Visible = false;
            this.Hide();
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == Keys.Escape) { Dismiss(); return true; }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        private static Image LoadLogoImage()
        {
            try { using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("RasDesktopAlert.logo.png"); if (s != null) return Image.FromStream(s); } catch { return null; }
        }
    }

    // ─── API MODELS ────────────────────────────────────────────────────────────────
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
            AlarmPlayer.Initialize();
            settings = SettingsManager.Load();
            trayIcon = new NotifyIcon() { Icon = LoadTrayIcon(), Text = "Five Stones RAS - Monitoring", Visible = true };
            var menu = new ContextMenuStrip();
            menu.Items.Add("Status: Monitoring", null, (s, e) => { });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Settings...", null, (s, e) => ShowSettings());
            menu.Items.Add("Test Alert", null, (s, e) => { if (!hasActiveAlert) TriggerAlert("TEST ALERT", "Test alert from tray menu.", "lockdown"); });
            menu.Items.Add("Check for Updates", null, async (s, e) => await CheckForUpdates(true));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit", null, (s, e) => { pollTimer?.Stop(); updateTimer?.Stop(); AlarmPlayer.Cleanup(); trayIcon.Visible = false; Application.Exit(); });
            trayIcon.ContextMenuStrip = menu;
            trayIcon.DoubleClick += (s, e) => ShowSettings();
            SettingsManager.ApplyAutoStart(settings.AutoStart);

            if (string.IsNullOrEmpty(settings.ApiKey) || settings.OrgId == 0)
            { var t = new System.Windows.Forms.Timer { Interval = 500 }; t.Tick += (s, e) => { t.Stop(); ShowSettings(); }; t.Start(); }
            else { trayIcon.Text = "Five Stones RAS - Connected"; menu.Items[0].Text = "Status: Connected"; }

            if (!string.IsNullOrEmpty(settings.ApiKey) && settings.OrgId != 0)
            { pollTimer = new System.Windows.Forms.Timer { Interval = 5000 }; pollTimer.Tick += async (s, e) => await PollForAlert(); pollTimer.Start(); }

            updateTimer = new System.Windows.Forms.Timer { Interval = 6 * 60 * 60 * 1000 };
            updateTimer.Tick += async (s, e) => await CheckForUpdates(false); updateTimer.Start();
            var su = new System.Windows.Forms.Timer { Interval = 3000 };
            su.Tick += async (s, e) => { su.Stop(); await CheckForUpdates(false); }; su.Start();
        }

        private Icon LoadTrayIcon()
        {
            try { using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("RasDesktopAlert.app.ico"); if (s != null) return new Icon(s, SystemInformation.SmallIconSize); } catch { }
            return SystemIcons.Shield;
        }

        private void ShowSettings()
        {
            if (settingsShowing) return; settingsShowing = true;
            var f = new SettingsForm() { ApiBaseUrl = settings.ApiBaseUrl, ApiKey = settings.ApiKey, OrgId = settings.OrgId, AutoStart = settings.AutoStart };
            if (f.ShowDialog() == DialogResult.OK)
            {
                settings.ApiBaseUrl = f.ApiBaseUrl; settings.ApiKey = f.ApiKey; settings.OrgId = f.OrgId; settings.AutoStart = f.AutoStart;
                SettingsManager.Save(settings);
                trayIcon.Text = "Five Stones RAS - Connected";
                trayIcon.ContextMenuStrip.Items[0].Text = "Status: Connected";
                pollTimer?.Stop(); pollTimer = new System.Windows.Forms.Timer { Interval = 5000 };
                pollTimer.Tick += async (s, e) => await PollForAlert(); pollTimer.Start();
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
                    else if ((a == null || a.Status == "resolved") && hasActiveAlert)
                    { hasActiveAlert = false; alertForm?.Invoke((System.Windows.Forms.MethodInvoker)(() => alertForm.Hide())); trayIcon.Text = "Five Stones RAS - Monitoring"; }
                }
            }
            catch { }
        }

        private void TriggerAlert(string alertType, string message, string rawType)
        {
            if (alertForm == null || alertForm.IsDisposed) alertForm = new AlertForm();
            alertForm.ShowAlert(alertType, message, rawType);
            trayIcon.Text = "\u26a0\ufe0f ALERT: " + alertType;
            trayIcon.ShowBalloonTip(15000, "\u26a0\ufe0f EMERGENCY ALERT", alertType + ": " + message, ToolTipIcon.Warning);
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
                if (MessageBox.Show("Version " + u.Version + " available. Install now?", "Update", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes && !string.IsNullOrEmpty(u.DownloadUrl))
                {
                    var t = Path.Combine(Path.GetTempPath(), "FiveStonesRASUpdate"); Directory.CreateDirectory(t);
                    var p = Path.Combine(t, "FiveStonesRASAlert-Setup.exe");
                    using var d = new HttpClient(); d.Timeout = TimeSpan.FromMinutes(5);
                    await File.WriteAllBytesAsync(p, await d.GetByteArrayAsync(u.DownloadUrl));
                    Process.Start(new ProcessStartInfo() { FileName = p, UseShellExecute = true, Verb = "runas" });
                    pollTimer?.Stop(); updateTimer?.Stop(); trayIcon.Visible = false; Application.Exit();
                }
            }
            catch (Exception ex) { if (userInitiated) MessageBox.Show("Update check: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        }
    }
}