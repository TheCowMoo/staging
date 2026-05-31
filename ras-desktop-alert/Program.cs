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
        private static readonly string BundledDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FiveStones", "RAS Alert");
        private static readonly string BundledPath = Path.Combine(BundledDir, "ras_settings.json");
        private static readonly string LogPath = Path.Combine(AppDir, "ras_error.log");
        private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = true, PropertyNameCaseInsensitive = true };

        public static void EnsureDirectoryExists() { try { Directory.CreateDirectory(AppDir); } catch { } }
        public static AppSettings Load()
        {
            EnsureDirectoryExists();

            // Priority 1: User-configured settings in CommonAppData
            try { if (File.Exists(SettingsPath)) return JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(SettingsPath), JsonOpts) ?? new(); }
            catch (Exception ex) { Log($"Load: {ex.Message}"); }

            // Priority 2: Bundled settings from installer (first-run only)
            try
            {
                if (File.Exists(BundledPath))
                {
                    var bundled = JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(BundledPath), JsonOpts);
                    if (bundled != null && !string.IsNullOrEmpty(bundled.ApiKey))
                    {
                        // Copy bundled settings to CommonAppData so they persist across updates
                        Save(bundled);
                        // Delete bundled copy so it doesn't re-apply on next launch
                        try { File.Delete(BundledPath); } catch { }
                        return bundled;
                    }
                }
            }
            catch (Exception ex) { Log($"Load bundled: {ex.Message}"); }

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
            this.Text = "Five Stones RAS Alert  v1.1.0";
            this.Size = new Size(800, 620);
            this.MinimumSize = new Size(720, 560);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Icon = LoadAppIcon();
            this.BackColor = BrandColors.White;
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
            header.Controls.Add(new Label()
            {
                Text = "Desktop Alert Monitor", Font = new Font("Segoe UI", 11, FontStyle.Regular),
                ForeColor = BrandColors.Gold, BackColor = Color.Transparent,
                Location = new Point(230, 26), AutoSize = true
            });

            // ── BODY ──
            var body = new Panel() { Dock = DockStyle.Fill, BackColor = BrandColors.White };
            body.Resize += (s, e) => RepositionBody(body);

            body.Controls.Add(new Label()
            {
                Text = "CONNECTION", Font = new Font("Segoe UI", 9, FontStyle.Bold),
                ForeColor = BrandColors.Steel, AutoSize = true,
                Location = new Point(36, 20)
            });

            // We'll position everything manually with proper resize handling
            body.Tag = 36; // left margin
            BuildForm(body);

            // ── FOOTER ──
            var footer = new Panel() { Dock = DockStyle.Bottom, Height = 32, BackColor = BrandColors.LightBg };
            footer.Controls.Add(new Label()
            {
                Text = "  \u2139\ufe0f  Get API key from Dashboard \u2192 Admin \u2192 API Keys",
                Font = new Font("Segoe UI", 8, FontStyle.Italic), ForeColor = BrandColors.TextMuted,
                Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft
            });

            this.Controls.Add(header);
            this.Controls.Add(body);
            this.Controls.Add(footer);
        }

        private void BuildForm(Panel body)
        {
            int leftMargin = 36;
            int labelW = 90;
            int fieldX = leftMargin + labelW + 12; // label right edge + gap
            int y = 44; // after "CONNECTION" header

            // Row: API URL
            body.Controls.Add(new Label()
            {
                Text = "API URL", TextAlign = ContentAlignment.MiddleRight,
                Location = new Point(leftMargin, y + 6), Size = new Size(labelW, 28),
                Font = new Font("Segoe UI", 10, FontStyle.Regular), ForeColor = BrandColors.TextMuted,
                Anchor = AnchorStyles.Left
            });
            apiUrlBox = new TextBox()
            {
                Text = "https://staging.fivestonestechnology.com",
                Font = new Font("Segoe UI", 10), BorderStyle = BorderStyle.FixedSingle,
                BackColor = Color.FromArgb(250, 251, 252),
                Location = new Point(fieldX, y), Height = 30,
                Anchor = AnchorStyles.Left | AnchorStyles.Right
            };
            body.Controls.Add(apiUrlBox);
            y += 48;

            // Row: API Key
            body.Controls.Add(new Label()
            {
                Text = "API Key", TextAlign = ContentAlignment.MiddleRight,
                Location = new Point(leftMargin, y + 6), Size = new Size(labelW, 28),
                Font = new Font("Segoe UI", 10, FontStyle.Regular), ForeColor = BrandColors.TextMuted,
                Anchor = AnchorStyles.Left
            });
            apiKeyBox = new TextBox()
            {
                PasswordChar = '*', Font = new Font("Segoe UI", 10),
                BorderStyle = BorderStyle.FixedSingle, BackColor = Color.FromArgb(250, 251, 252),
                Location = new Point(fieldX, y), Height = 30,
                Anchor = AnchorStyles.Left | AnchorStyles.Right
            };
            body.Controls.Add(apiKeyBox);
            y += 48;

            // Row: Org ID
            body.Controls.Add(new Label()
            {
                Text = "Org ID", TextAlign = ContentAlignment.MiddleRight,
                Location = new Point(leftMargin, y + 6), Size = new Size(labelW, 28),
                Font = new Font("Segoe UI", 10, FontStyle.Regular), ForeColor = BrandColors.TextMuted,
                Anchor = AnchorStyles.Left
            });
            orgIdBox = new NumericUpDown()
            {
                Minimum = 0, Maximum = 999999, Font = new Font("Segoe UI", 10),
                BackColor = Color.FromArgb(250, 251, 252),
                Location = new Point(fieldX, y), Width = 180, Height = 30
            };
            body.Controls.Add(orgIdBox);
            y += 48;

            // Row: Auto-start
            autoStartCheck = new CheckBox()
            {
                Text = "Launch at Windows startup",
                Font = new Font("Segoe UI", 10), AutoSize = true,
                ForeColor = BrandColors.TextMuted,
                Location = new Point(fieldX, y + 4)
            };
            body.Controls.Add(autoStartCheck);
            y += 50;

            // Divider
            var sep = new Panel()
            {
                Location = new Point(leftMargin, y),
                Height = 1, BackColor = BrandColors.Border,
                Anchor = AnchorStyles.Left | AnchorStyles.Right
            };
            body.Controls.Add(sep);
            y += 22;

            // Section: ACTIVATE
            body.Controls.Add(new Label()
            {
                Text = "ACTIVATE", Font = new Font("Segoe UI", 9, FontStyle.Bold),
                ForeColor = BrandColors.Steel, AutoSize = true,
                Location = new Point(leftMargin, y)
            });
            y += 30;

            // Test button
            testBtn = new RoundButton()
            {
                Text = "Test Connection",
                Location = new Point(fieldX, y),
                Size = new Size(155, 36),
                BackColor = BrandColors.Success,
                ForeColor = BrandColors.White,
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            testBtn.Click += async (s, e) => await TestConnection(body);
            body.Controls.Add(testBtn);
            y += 44;

            // Status label
            statusLabel = new Label()
            {
                Text = "",
                Location = new Point(fieldX, y),
                Font = new Font("Segoe UI", 9),
                ForeColor = BrandColors.TextMuted,
                Width = 400, Height = 20,
                AutoSize = false
            };
            body.Controls.Add(statusLabel);
            y += 36;

            // Save / Cancel
            saveBtn = new RoundButton()
            {
                Text = "Save && Connect",
                Location = new Point(fieldX, y),
                Size = new Size(140, 38),
                BackColor = BrandColors.Navy,
                ForeColor = BrandColors.White,
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            saveBtn.Click += (s, e) =>
            {
                if (string.IsNullOrWhiteSpace(apiUrlBox.Text) || string.IsNullOrWhiteSpace(apiKeyBox.Text))
                { MessageBox.Show("Please fill all fields.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
                DialogResult = DialogResult.OK; Close();
            };
            cancelBtn = new RoundButton()
            {
                Text = "Cancel",
                Location = new Point(fieldX + 150, y),
                Size = new Size(100, 38),
                BackColor = Color.FromArgb(100, 116, 139),
                ForeColor = BrandColors.White,
                Font = new Font("Segoe UI", 10),
                Cursor = Cursors.Hand
            };
            cancelBtn.Click += (s, e) => { DialogResult = DialogResult.Cancel; Close(); };
            body.Controls.Add(saveBtn);
            body.Controls.Add(cancelBtn);
            this.AcceptButton = saveBtn; this.CancelButton = cancelBtn;
        }

        private void RepositionBody(Panel body)
        {
            var width = body.ClientSize.Width;
            int fieldX = 138; // leftMargin(36) + labelW(90) + gap(12)
            int fieldWidth = width - fieldX - 36; // right margin

            // Update text box widths
            if (apiUrlBox != null && apiUrlBox.Width != fieldWidth)
            {
                apiUrlBox.Width = Math.Max(fieldWidth, 200);
                apiKeyBox.Width = Math.Max(fieldWidth, 200);
                statusLabel.Width = Math.Min(fieldWidth, 400);
            }
        }

        private async Task TestConnection(Panel body)
        {
            if (testing) return;
            testing = true; testBtn.Enabled = false;
            statusLabel.ForeColor = BrandColors.TextMuted;
            statusLabel.Text = "Testing...";
            statusLabel.Height = 40;

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
            try { using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("RasDesktopAlert.logo.png"); if (s != null) return Image.FromStream(s); } catch { }
            return null;
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
            this.ControlBox = true;
            this.BackColor = Color.Black;

            int screenH = Screen.PrimaryScreen.Bounds.Height;

            // Branded header
            brandedHeader = new Panel() { Height = (int)(screenH * 0.05), Dock = DockStyle.Top, BackColor = BrandColors.Navy, Visible = false };
            var headerLogo = new PictureBox()
            {
                Image = LoadLogoImage(), SizeMode = PictureBoxSizeMode.Zoom,
                Width = (int)(screenH * 0.15), Height = (int)(screenH * 0.034), BackColor = Color.Transparent,
                Location = new Point((int)(screenH * 0.01), (int)(screenH * 0.008))
            };
            var brandLabel = new Label()
            {
                Text = "  Five Stones Technology  \u2014  Response Activation System",
                Font = new Font("Segoe UI", (float)(screenH * 0.012), FontStyle.Bold), ForeColor = BrandColors.Gold,
                Location = new Point((int)(screenH * 0.17), (int)(screenH * 0.012)), AutoSize = true, BackColor = Color.Transparent
            };
            brandedHeader.Controls.Add(headerLogo);
            brandedHeader.Controls.Add(brandLabel);

            // Alert type text
            alertLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Top, Height = (int)(screenH * 0.18),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Arial Black", (float)(screenH * 0.06), FontStyle.Bold),
                ForeColor = Color.White, BackColor = Color.Transparent, Visible = false
            };

            // Alert message
            messageLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", (float)(screenH * 0.028), FontStyle.Regular), ForeColor = Color.White,
                BackColor = Color.Transparent, Padding = new Padding(50, 0, 50, 40), Visible = false
            };

            // Dismiss button
            dismissButton = new RoundButton()
            {
                Text = "ACKNOWLEDGE && DISMISS",
                Size = new Size((int)(screenH * 0.35), (int)(screenH * 0.065)),
                BackColor = Color.FromArgb(230, Color.White),
                ForeColor = Color.FromArgb(30, 30, 30),
                Font = new Font("Segoe UI", (float)(screenH * 0.018), FontStyle.Bold),
                Visible = false, Cursor = Cursors.Hand, Anchor = AnchorStyles.None
            };
            dismissButton.Click += (s, e) => Dismiss();

            var bottomPanel = new Panel() { Dock = DockStyle.Bottom, Height = (int)(screenH * 0.11), BackColor = Color.Transparent };
            bottomPanel.Controls.Add(dismissButton);

            this.Controls.Add(brandedHeader);
            this.Controls.Add(alertLabel);
            this.Controls.Add(messageLabel);
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
        private static readonly Version CurrentVersion = new(1, 1, 0, 0);
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