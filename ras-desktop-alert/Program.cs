using System;
using System.Drawing;
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
        public static readonly Color Surface = Color.FromArgb(217, 226, 236);
        public static readonly Color White = Color.White;
        public static readonly Color AlertRed = Color.FromArgb(220, 38, 38);
        public static readonly Color AlertOrange = Color.FromArgb(234, 88, 12);
        public static readonly Color AlertBlue = Color.FromArgb(37, 99, 235);
    }

    // ─── MP3 ALARM PLAYER (Windows MCI, no external dependencies) ────────────────
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
                // Extract the MP3 from embedded resources to a temp file
                using var stream = Assembly.GetExecutingAssembly()
                    .GetManifestResourceStream("RasDesktopAlert.alarm.mp3");
                if (stream != null)
                {
                    _tempFile = Path.Combine(Path.GetTempPath(), "fivestones_alarm.mp3");
                    using var fs = new FileStream(_tempFile, FileMode.Create, FileAccess.Write);
                    stream.CopyTo(fs);
                    fs.Flush();
                }
                _initialized = true;
            }
            catch (Exception ex) { Debug.WriteLine($"Alarm init error: {ex.Message}"); }
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

        public static void Cleanup()
        {
            StopAlarm();
            try { if (_tempFile != null && File.Exists(_tempFile)) File.Delete(_tempFile); } catch { }
        }
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

    // ─── SETTINGS FORM ────────────────────────────────────────────────────────────
    public class SettingsForm : Form
    {
        private TextBox apiUrlBox, apiKeyBox;
        private NumericUpDown orgIdBox;
        private CheckBox autoStartCheck;
        private Button testBtn;
        private Label statusLabel;
        private bool testing = false;

        public string ApiBaseUrl { get => apiUrlBox.Text.Trim(); set => apiUrlBox.Text = value; }
        public string ApiKey { get => apiKeyBox.Text.Trim(); set => apiKeyBox.Text = value; }
        public int OrgId { get => (int)orgIdBox.Value; set => orgIdBox.Value = Math.Max(orgIdBox.Minimum, Math.Min(orgIdBox.Maximum, value)); }
        public bool AutoStart { get => autoStartCheck.Checked; set => autoStartCheck.Checked = value; }

        public SettingsForm()
        {
            this.Text = "Five Stones RAS Alert — Settings";
            this.Size = new Size(580, 490);
            this.MinimumSize = this.Size;
            this.MaximumSize = new Size(620, 540);
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Icon = LoadAppIcon();
            this.BackColor = BrandColors.White;
            this.Padding = new Padding(0);

            // ── Brand header with logo ──
            var headerPanel = new Panel() { Dock = DockStyle.Top, Height = 64, BackColor = BrandColors.Navy };
            var headerLogo = new PictureBox()
            {
                Image = LoadLogoImage(),
                SizeMode = PictureBoxSizeMode.Zoom,
                Width = 180, Height = 42,
                BackColor = Color.Transparent,
                Location = new Point(12, 11)
            };
            headerPanel.Controls.Add(headerLogo);
            var headerText = new Label()
            {
                Text = "RAS Alert Monitor",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                ForeColor = BrandColors.Gold,
                Location = new Point(200, 14),
                AutoSize = true,
                BackColor = Color.Transparent
            };
            headerPanel.Controls.Add(headerText);

            // ── Body layout ──
            var bodyPanel = new Panel() { Dock = DockStyle.Fill, Padding = new Padding(24, 16, 24, 8) };

            var layout = new TableLayoutPanel()
            {
                Dock = DockStyle.Fill,
                ColumnCount = 2,
                RowCount = 6,
                ColumnStyles = {
                    new ColumnStyle(SizeType.Absolute, 100),
                    new ColumnStyle(SizeType.Percent, 100)
                },
                RowStyles = {
                    new RowStyle(SizeType.Absolute, 44),
                    new RowStyle(SizeType.Absolute, 44),
                    new RowStyle(SizeType.Absolute, 44),
                    new RowStyle(SizeType.Absolute, 44),
                    new RowStyle(SizeType.Absolute, 50),
                    new RowStyle(SizeType.Absolute, 60)
                }
            };

            var labelFont = new Font("Segoe UI", 10, FontStyle.Regular);
            var inputFont = new Font("Segoe UI", 10, FontStyle.Regular);

            // Row 0: API URL
            layout.Controls.Add(new Label() { Text = "API URL:", TextAlign = ContentAlignment.MiddleRight, Anchor = AnchorStyles.Right, Font = labelFont }, 0, 0);
            apiUrlBox = new TextBox() { Text = "https://staging.fivestonestechnology.com", Dock = DockStyle.Fill, Font = inputFont, Margin = new Padding(6, 6, 0, 6) };
            layout.Controls.Add(apiUrlBox, 1, 0);

            // Row 1: API Key
            layout.Controls.Add(new Label() { Text = "API Key:", TextAlign = ContentAlignment.MiddleRight, Anchor = AnchorStyles.Right, Font = labelFont }, 0, 1);
            apiKeyBox = new TextBox() { PasswordChar = '*', Dock = DockStyle.Fill, Font = inputFont, Margin = new Padding(6, 6, 0, 6) };
            layout.Controls.Add(apiKeyBox, 1, 1);

            // Row 2: Org ID
            layout.Controls.Add(new Label() { Text = "Org ID:", TextAlign = ContentAlignment.MiddleRight, Anchor = AnchorStyles.Right, Font = labelFont }, 0, 2);
            orgIdBox = new NumericUpDown() { Minimum = 0, Maximum = 999999, Width = 160, Font = inputFont, Margin = new Padding(6, 6, 0, 6) };
            layout.Controls.Add(orgIdBox, 1, 2);

            // Row 3: Auto-start
            autoStartCheck = new CheckBox() { Text = "Launch at Windows startup", Font = labelFont, Margin = new Padding(8, 10, 0, 6), AutoSize = true };
            layout.Controls.Add(autoStartCheck, 1, 3);

            // Row 4: Test Connection
            var testPanel = new FlowLayoutPanel() { Dock = DockStyle.Fill, FlowDirection = FlowDirection.LeftToRight, Margin = new Padding(0, 2, 0, 0) };
            testBtn = new Button()
            {
                Text = "Test Connection",
                Size = new Size(140, 32),
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(34, 197, 94),
                ForeColor = Color.White,
                FlatAppearance = { BorderSize = 0 },
                Cursor = Cursors.Hand,
                Margin = new Padding(6, 2, 0, 0)
            };
            testBtn.Click += async (s, e) => await TestConnection();
            testPanel.Controls.Add(testBtn);

            statusLabel = new Label()
            {
                Text = "",
                Font = new Font("Segoe UI", 9, FontStyle.Regular),
                AutoSize = true,
                Margin = new Padding(10, 6, 0, 0),
                MaximumSize = new Size(280, 40)
            };
            testPanel.Controls.Add(statusLabel);
            layout.Controls.Add(testPanel, 1, 4);

            // Row 5: Save / Cancel
            var buttonPanel = new FlowLayoutPanel() { Dock = DockStyle.Fill, FlowDirection = FlowDirection.RightToLeft, Margin = new Padding(0, 8, 0, 0) };
            var saveBtn = new Button()
            {
                Text = "Save & Connect", Size = new Size(130, 36), Font = new Font("Segoe UI", 10, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat, BackColor = BrandColors.Navy, ForeColor = BrandColors.White,
                FlatAppearance = { BorderSize = 0 }, Cursor = Cursors.Hand
            };
            saveBtn.Click += (s, e) =>
            {
                if (string.IsNullOrWhiteSpace(apiUrlBox.Text) || string.IsNullOrWhiteSpace(apiKeyBox.Text))
                { MessageBox.Show("Please fill all fields.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
                DialogResult = DialogResult.OK; Close();
            };
            var cancelBtn = new Button() { Text = "Cancel", Size = new Size(100, 36), Font = new Font("Segoe UI", 10), Cursor = Cursors.Hand };
            cancelBtn.Click += (s, e) => { DialogResult = DialogResult.Cancel; Close(); };
            buttonPanel.Controls.Add(saveBtn); buttonPanel.Controls.Add(cancelBtn);
            layout.Controls.Add(buttonPanel, 1, 5);

            bodyPanel.Controls.Add(layout);

            // ── Footer ──
            var footerLabel = new Label()
            {
                Text = "Get API key from Dashboard \u2192 Admin \u2192 API Keys",
                Dock = DockStyle.Bottom, TextAlign = ContentAlignment.MiddleLeft,
                Font = new Font("Segoe UI", 8, FontStyle.Italic), ForeColor = BrandColors.Steel,
                Height = 28, Padding = new Padding(20, 2, 0, 0), BackColor = Color.FromArgb(240, 243, 246)
            };

            this.Controls.Add(headerPanel);
            this.Controls.Add(bodyPanel);
            this.Controls.Add(footerLabel);
            this.AcceptButton = saveBtn;
            this.CancelButton = cancelBtn;
        }

        private async Task TestConnection()
        {
            if (testing) return;
            testing = true;
            testBtn.Enabled = false;
            statusLabel.ForeColor = BrandColors.Steel;
            statusLabel.Text = "Testing...";

            try
            {
                using var c = new HttpClient();
                c.DefaultRequestHeaders.Add("X-Api-Key", apiKeyBox.Text.Trim());
                c.Timeout = TimeSpan.FromSeconds(8);
                var url = $"{apiUrlBox.Text.Trim().TrimEnd('/')}/api/ras/alerts/active?orgId={(int)orgIdBox.Value}";
                var r = await c.GetAsync(url);

                if (r.IsSuccessStatusCode)
                {
                    statusLabel.ForeColor = Color.FromArgb(22, 163, 74);
                    statusLabel.Text = "\u2713 Connected! Alert polling is working.";
                }
                else if (r.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    statusLabel.ForeColor = Color.FromArgb(220, 38, 38);
                    statusLabel.Text = "\u2717 Unauthorized \u2014 check your API key.";
                }
                else
                {
                    statusLabel.ForeColor = Color.FromArgb(220, 38, 38);
                    statusLabel.Text = $"\u2717 Server returned {(int)r.StatusCode}. Check settings.";
                }
            }
            catch (TaskCanceledException)
            {
                statusLabel.ForeColor = Color.FromArgb(220, 38, 38);
                statusLabel.Text = "\u2717 Connection timed out.";
            }
            catch (HttpRequestException ex)
            {
                statusLabel.ForeColor = Color.FromArgb(220, 38, 38);
                statusLabel.Text = $"\u2717 {ex.Message}";
            }
            catch (Exception ex)
            {
                statusLabel.ForeColor = Color.FromArgb(220, 38, 38);
                statusLabel.Text = $"\u2717 {ex.Message}";
            }
            finally
            {
                testing = false;
                testBtn.Enabled = true;
            }
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

            // Branded header with logo
            brandedHeader = new Panel() { Height = 48, Dock = DockStyle.Top, BackColor = BrandColors.Navy, Visible = false };
            var headerLogo = new PictureBox()
            {
                Image = LoadLogoImage(),
                SizeMode = PictureBoxSizeMode.Zoom,
                Width = 140, Height = 32,
                BackColor = Color.Transparent,
                Location = new Point(8, 8)
            };
            var brandLabel = new Label()
            {
                Text = "  Five Stones Technology  \u2014  Response Activation System",
                Font = new Font("Segoe UI", 12, FontStyle.Bold), ForeColor = BrandColors.Gold,
                Location = new Point(156, 10), AutoSize = true, BackColor = Color.Transparent
            };
            brandedHeader.Controls.Add(headerLogo);
            brandedHeader.Controls.Add(brandLabel);

            alertLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Top, Height = 140,
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Arial Black", 56, FontStyle.Bold),
                ForeColor = Color.White, BackColor = Color.Transparent, Visible = false
            };

            messageLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", 28, FontStyle.Regular), ForeColor = Color.White,
                BackColor = Color.Transparent, Padding = new Padding(40, 0, 40, 60), Visible = false
            };

            dismissButton = new Button()
            {
                Text = "ACKNOWLEDGE & DISMISS", FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(220, Color.White), ForeColor = Color.Black,
                Font = new Font("Segoe UI", 16, FontStyle.Bold), Size = new Size(380, 70),
                FlatAppearance = { BorderSize = 0 }, Visible = false, Cursor = Cursors.Hand
            };
            dismissButton.Click += (s, e) => Dismiss();

            var bottomPanel = new Panel() { Dock = DockStyle.Bottom, Height = 110, BackColor = Color.Transparent };

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
            AlarmPlayer.PlayAlarm();
            if (!this.Visible) this.Show();
            this.Activate(); this.TopMost = true; this.BringToFront();
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
            try { using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("RasDesktopAlert.logo.png"); if (s != null) return Image.FromStream(s); } catch { }
            return null;
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
            menu.Items.Add("Exit", null, (s, e) =>
            {
                pollTimer?.Stop(); updateTimer?.Stop();
                AlarmPlayer.Cleanup();
                trayIcon.Visible = false; Application.Exit();
            });
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
            catch (Exception ex) { if (userInitiated) MessageBox.Show("Update check failed: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        }
    }
}