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

        private static string _appVersion;
        public static string AppVersion
        {
            get
            {
                if (_appVersion == null)
                {
                    var v = Assembly.GetExecutingAssembly().GetName().Version;
                    _appVersion = v != null ? $"v{v.Major}.{v.Minor}.{v.Build}" : "v1.0.0";
                }
                return _appVersion;
            }
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

    // ─── COLOR HELPER ─────────────────────────────────────────────────────────────
    public static class ColorHelper
    {
        public static Color AdjustBrightness(Color c, float factor)
        {
            return Color.FromArgb(
                Math.Min(255, (int)(c.R * factor)),
                Math.Min(255, (int)(c.G * factor)),
                Math.Min(255, (int)(c.B * factor)));
        }
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
            try { if (File.Exists(SettingsPath)) return JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(SettingsPath), JsonOpts) ?? new(); }
            catch (Exception ex) { Log($"Load: {ex.Message}"); }
            try
            {
                if (File.Exists(BundledPath))
                {
                    var bundled = JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(BundledPath), JsonOpts);
                    if (bundled != null && !string.IsNullOrEmpty(bundled.ApiKey))
                    {
                        Save(bundled);
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

    // ─── ROUNDED BUTTON WITH HOVER ────────────────────────────────────────────────
    public class RoundButton : Button
    {
        private int _r = 8;
        private bool _hovered;
        public RoundButton()
        {
            FlatStyle = FlatStyle.Flat;
            FlatAppearance.BorderSize = 0;
            AutoSize = false;
            Padding = new Padding(20, 0, 20, 0);
        }
        protected override void OnMouseEnter(EventArgs e) { _hovered = true; Invalidate(); base.OnMouseEnter(e); }
        protected override void OnMouseLeave(EventArgs e) { _hovered = false; Invalidate(); base.OnMouseLeave(e); }
        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            var c = _hovered ? ColorHelper.AdjustBrightness(BackColor, 1.15f) : BackColor;
            using var path = new GraphicsPath();
            path.AddArc(0, 0, _r, _r, 180, 90);
            path.AddArc(Width - _r - 1, 0, _r, _r, 270, 90);
            path.AddArc(Width - _r - 1, Height - _r - 1, _r, _r, 0, 90);
            path.AddArc(0, Height - _r - 1, _r, _r, 90, 90);
            path.CloseFigure();
            using var sb = new SolidBrush(c);
            e.Graphics.FillPath(sb, path);
            // Draw text centered using full client area (no Region clipping)
            TextRenderer.DrawText(e.Graphics, Text, Font, ClientRectangle, ForeColor,
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
        }
    }

    // ─── ROUNDED PANEL HELPER ────────────────────────────────────────────────────
    public class RoundedPanel : Panel
    {
        private GraphicsPath _path;
        private int _r = 8;
        protected override void OnResize(EventArgs e) { UpdateRegion(); base.OnResize(e); }
        private void UpdateRegion()
        {
            if (_path != null) _path.Dispose();
            _path = new GraphicsPath();
            _path.AddArc(0, 0, _r, _r, 180, 90);
            _path.AddArc(Width - _r - 1, 0, _r, _r, 270, 90);
            _path.AddArc(Width - _r - 1, Height - _r - 1, _r, _r, 0, 90);
            _path.AddArc(0, Height - _r - 1, _r, _r, 90, 90);
            _path.CloseFigure();
            this.Region = new Region(_path);
        }
        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using var sb = new SolidBrush(BackColor);
            e.Graphics.FillPath(sb, _path);
            using var p = new Pen(BrandColors.Border);
            e.Graphics.DrawPath(p, _path);
        }
    }

    // ─── STATUS BADGE ──────────────────────────────────────────────────────────────
    public class StatusBadge : Control
    {
        private string _statusText = "";
        private Color _badgeColor = BrandColors.TextMuted;
        public StatusBadge() { Width = 160; Height = 26; }
        public void SetStatus(string text, Color badgeColor)
        {
            _statusText = text;
            _badgeColor = badgeColor;
            Invalidate();
        }
        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            int bw = Width, bh = Height;
            using var path = new GraphicsPath();
            int cr = bh / 2;
            path.AddArc(0, 0, cr * 2, cr * 2, 180, 90);
            path.AddArc(bw - cr * 2 - 1, 0, cr * 2, cr * 2, 270, 90);
            path.AddArc(bw - cr * 2 - 1, bh - cr * 2 - 1, cr * 2, cr * 2, 0, 90);
            path.AddArc(0, bh - cr * 2 - 1, cr * 2, cr * 2, 90, 90);
            path.CloseFigure();
            using var sb = new SolidBrush(Color.FromArgb(245, 245, 250));
            e.Graphics.FillPath(sb, path);
            using var p = new Pen(Color.FromArgb(220, 220, 230));
            e.Graphics.DrawPath(p, path);
            e.Graphics.FillEllipse(new SolidBrush(_badgeColor), 8, (bh - 8) / 2, 8, 8);

            var displayText = _statusText;
            var tw = TextRenderer.MeasureText(displayText, Font).Width;
            if (tw > bw - 32)
            {
                while (displayText.Length > 0 && TextRenderer.MeasureText(displayText + "…", Font).Width > bw - 32)
                    displayText = displayText[..^1];
                displayText += "…";
            }
            TextRenderer.DrawText(e.Graphics, displayText, Font,
                new Point(22, (bh - TextRenderer.MeasureText(displayText, Font).Height) / 2),
                BrandColors.TextMuted, TextFormatFlags.Default);
        }
    }

    // ─── SETTINGS FORM ────────────────────────────────────────────────────────────
    public class SettingsForm : Form
    {
        private TextBox apiUrlBox, apiKeyBox;
        private NumericUpDown orgIdBox;
        private CheckBox autoStartCheck;
        private RoundButton testBtn, saveBtn, cancelBtn;
        private StatusBadge statusBadge;
        private Label statusLabel;
        private bool testing = false;

        public string ApiBaseUrl { get => apiUrlBox.Text.Trim(); set => apiUrlBox.Text = value; }
        public string ApiKey { get => apiKeyBox.Text.Trim(); set => apiKeyBox.Text = value; }
        public int OrgId { get => (int)orgIdBox.Value; set => orgIdBox.Value = Math.Max(orgIdBox.Minimum, Math.Min(orgIdBox.Maximum, value)); }
        public bool AutoStart { get => autoStartCheck.Checked; set => autoStartCheck.Checked = value; }

        public SettingsForm()
        {
            var ver = Program.AppVersion;
            this.Text = $"Five Stones RAS Alert  {ver}";
            this.Size = new Size(820, 640);
            this.MinimumSize = new Size(740, 560);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Icon = LoadAppIcon();
            this.BackColor = BrandColors.White;
            this.Font = new Font("Segoe UI", 10);

            // ── HEADER ──
            var header = new Panel() { Height = 80, Dock = DockStyle.Top, BackColor = BrandColors.Navy };
            var logo = new PictureBox()
            {
                Image = LoadLogoImage(), SizeMode = PictureBoxSizeMode.Zoom,
                Width = 200, Height = 48, BackColor = Color.Transparent,
                Location = new Point(16, 14)
            };
            header.Controls.Add(logo);
            header.Controls.Add(new Label()
            {
                Text = "Desktop Alert Monitor", Font = new Font("Segoe UI", 11, FontStyle.Regular),
                ForeColor = BrandColors.Gold, BackColor = Color.Transparent,
                Location = new Point(230, 18), AutoSize = true
            });
            var verChip = new Label()
            {
                Text = ver, Font = new Font("Segoe UI", 8, FontStyle.Bold),
                ForeColor = Color.White, BackColor = BrandColors.Steel,
                AutoSize = false, Width = 55, Height = 20,
                Location = new Point(230, 52), TextAlign = ContentAlignment.MiddleCenter
            };
            using (var gp = new GraphicsPath())
            {
                gp.AddArc(0, 0, 10, 10, 180, 90);
                gp.AddArc(verChip.Width - 11, 0, 10, 10, 270, 90);
                gp.AddArc(verChip.Width - 11, verChip.Height - 11, 10, 10, 0, 90);
                gp.AddArc(0, verChip.Height - 11, 10, 10, 90, 90);
                gp.CloseFigure();
                verChip.Region = new Region(gp);
            }
            header.Controls.Add(verChip);
            var accentLine = new Panel() { Height = 2, Dock = DockStyle.Bottom, BackColor = BrandColors.Gold };
            header.Controls.Add(accentLine);

            // ── BODY ──
            var body = new Panel() { Dock = DockStyle.Fill, BackColor = BrandColors.LightBg };
            body.Resize += (s, e) => RepositionBody(body);

            // Connection section card
            var connCard = new RoundedPanel()
            {
                BackColor = BrandColors.White,
                Location = new Point(32, 28),
                Size = new Size(body.Width - 64, 270),
                Anchor = AnchorStyles.Left | AnchorStyles.Top | AnchorStyles.Right
            };
            int cardPad = 28;
            int leftX = cardPad;
            int labelW = 90;
            int inputX = leftX + labelW + 10;
            int fieldW = connCard.Width - inputX - cardPad;
            int y = 16;

            var connTitle = new Label()
            {
                Text = "CONNECTION", Font = new Font("Segoe UI", 9, FontStyle.Bold),
                ForeColor = BrandColors.Steel, AutoSize = true,
                Location = new Point(cardPad, 14)
            };
            connCard.Controls.Add(connTitle);
            y = 46;

            connCard.Controls.Add(new Label()
            {
                Text = "API URL", TextAlign = ContentAlignment.MiddleRight,
                Location = new Point(leftX, y + 6), Size = new Size(labelW, 28),
                Font = new Font("Segoe UI", 10, FontStyle.Regular), ForeColor = BrandColors.TextMuted
            });
            apiUrlBox = new TextBox()
            {
                Text = "https://staging.fivestonestechnology.com",
                Font = new Font("Segoe UI", 10), BorderStyle = BorderStyle.FixedSingle,
                BackColor = Color.FromArgb(250, 251, 252),
                Location = new Point(inputX, y), Height = 30, Width = fieldW,
                Anchor = AnchorStyles.Left | AnchorStyles.Right
            };
            connCard.Controls.Add(apiUrlBox);
            y += 48;

            connCard.Controls.Add(new Label()
            {
                Text = "API Key", TextAlign = ContentAlignment.MiddleRight,
                Location = new Point(leftX, y + 6), Size = new Size(labelW, 28),
                Font = new Font("Segoe UI", 10, FontStyle.Regular), ForeColor = BrandColors.TextMuted
            });
            apiKeyBox = new TextBox()
            {
                PasswordChar = '*', Font = new Font("Segoe UI", 10),
                BorderStyle = BorderStyle.FixedSingle, BackColor = Color.FromArgb(250, 251, 252),
                Location = new Point(inputX, y), Height = 30, Width = fieldW,
                Anchor = AnchorStyles.Left | AnchorStyles.Right
            };
            connCard.Controls.Add(apiKeyBox);
            y += 48;

            connCard.Controls.Add(new Label()
            {
                Text = "Org ID", TextAlign = ContentAlignment.MiddleRight,
                Location = new Point(leftX, y + 6), Size = new Size(labelW, 28),
                Font = new Font("Segoe UI", 10, FontStyle.Regular), ForeColor = BrandColors.TextMuted
            });
            orgIdBox = new NumericUpDown()
            {
                Minimum = 0, Maximum = 999999, Font = new Font("Segoe UI", 10),
                BackColor = Color.FromArgb(250, 251, 252),
                Location = new Point(inputX, y), Width = 180, Height = 30
            };
            connCard.Controls.Add(orgIdBox);
            y += 48;

            autoStartCheck = new CheckBox()
            {
                Text = "Launch at Windows startup",
                Font = new Font("Segoe UI", 10), AutoSize = true,
                ForeColor = BrandColors.TextMuted,
                Location = new Point(inputX, y + 4)
            };
            connCard.Controls.Add(autoStartCheck);
            body.Controls.Add(connCard);

            // Activate section card
            int actY = connCard.Bottom + 16;
            var actCard = new RoundedPanel()
            {
                BackColor = BrandColors.White,
                Location = new Point(32, actY),
                Size = new Size(body.Width - 64, 280),
                Anchor = AnchorStyles.Left | AnchorStyles.Top | AnchorStyles.Right
            };
            int ay = 16;
            actCard.Controls.Add(new Label()
            {
                Text = "ACTIVATE", Font = new Font("Segoe UI", 9, FontStyle.Bold),
                ForeColor = BrandColors.Steel, AutoSize = true,
                Location = new Point(cardPad, 14)
            });
            ay = 46;

            // Auto-size buttons by measuring text width + padding
            const int btnPadding = 40; // 20px each side
            using (var g = CreateGraphics())
            {
                var btnFont = new Font("Segoe UI", 10, FontStyle.Bold);
                int testW = TextRenderer.MeasureText(g, "Test Connection", btnFont, Size.Empty, TextFormatFlags.Default).Width + btnPadding;
                int saveW = TextRenderer.MeasureText(g, "Save && Connect", btnFont, Size.Empty, TextFormatFlags.Default).Width + btnPadding;

                testBtn = new RoundButton()
                {
                    Text = "Test Connection",
                    Location = new Point(inputX, ay),
                    Size = new Size(Math.Max(testW, 180), 40),
                    BackColor = BrandColors.Success,
                    ForeColor = BrandColors.White,
                    Font = btnFont,
                    Cursor = Cursors.Hand
                };
                testBtn.Click += async (s, e) => await TestConnection();
                actCard.Controls.Add(testBtn);
                ay += 50;

                // Status badge
                statusBadge = new StatusBadge()
                {
                    Location = new Point(inputX, ay),
                    Font = new Font("Segoe UI", 9),
                };
                statusBadge.SetStatus("Not tested", BrandColors.TextMuted);
                actCard.Controls.Add(statusBadge);

                statusLabel = new Label()
                {
                    Text = "",
                    Location = new Point(inputX, ay + 28),
                    AutoSize = true,
                    Font = new Font("Segoe UI", 9),
                    ForeColor = BrandColors.TextMuted
                };
                actCard.Controls.Add(statusLabel);
                ay += 54;
                ay += 8;

                saveBtn = new RoundButton()
                {
                    Text = "Save && Connect",
                    Location = new Point(inputX, ay),
                    Size = new Size(Math.Max(saveW, 180), 40),
                    BackColor = BrandColors.Navy,
                    ForeColor = BrandColors.White,
                    Font = btnFont,
                    Cursor = Cursors.Hand
                };
                saveBtn.Click += (s, e) =>
                {
                    if (string.IsNullOrWhiteSpace(apiUrlBox.Text) || string.IsNullOrWhiteSpace(apiKeyBox.Text))
                    { MessageBox.Show("Please fill all fields.", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }
                    DialogResult = DialogResult.OK; Close();
                };
                int cancelX = inputX + Math.Max(saveW, 180) + 15;
                cancelBtn = new RoundButton()
                {
                    Text = "Cancel",
                    Location = new Point(cancelX, ay),
                    Size = new Size(110, 40),
                    BackColor = Color.FromArgb(100, 116, 139),
                    ForeColor = BrandColors.White,
                    Font = new Font("Segoe UI", 10),
                    Cursor = Cursors.Hand
                };
                cancelBtn.Click += (s, e) => { DialogResult = DialogResult.Cancel; Close(); };
                actCard.Controls.Add(saveBtn);
                actCard.Controls.Add(cancelBtn);
            }
            body.Controls.Add(actCard);

            // ── FOOTER ──
            var footer = new Panel() { Dock = DockStyle.Bottom, Height = 36, BackColor = BrandColors.LightBg };
            var borderLine = new Panel() { Height = 1, Dock = DockStyle.Top, BackColor = BrandColors.Border };
            footer.Controls.Add(borderLine);
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

        private void RepositionBody(Panel body)
        {
            int cardW = body.Width - 64;
            foreach (Control c in body.Controls)
                if (c is RoundedPanel rp)
                    rp.Width = cardW;
        }

        private async Task TestConnection()
        {
            if (testing) return;
            testing = true; testBtn.Enabled = false;
            statusBadge.SetStatus("Testing...", Color.FromArgb(234, 179, 8));
            statusLabel.ForeColor = BrandColors.TextMuted;
            statusLabel.Text = "Connecting...";
            try
            {
                using var c = new HttpClient();
                c.DefaultRequestHeaders.Add("X-Api-Key", apiKeyBox.Text.Trim());
                c.Timeout = TimeSpan.FromSeconds(8);
                var r = await c.GetAsync($"{apiUrlBox.Text.Trim().TrimEnd('/')}/api/ras/alerts/active?orgId={(int)orgIdBox.Value}");
                if (r.IsSuccessStatusCode) { statusBadge.SetStatus("Connected", BrandColors.Success); statusLabel.ForeColor = BrandColors.Success; statusLabel.Text = "Alert polling works."; }
                else if (r.StatusCode == System.Net.HttpStatusCode.Unauthorized) { statusBadge.SetStatus("Unauthorized", BrandColors.Danger); statusLabel.ForeColor = BrandColors.Danger; statusLabel.Text = "Check your API key."; }
                else { statusBadge.SetStatus("Error", BrandColors.Danger); statusLabel.ForeColor = BrandColors.Danger; statusLabel.Text = $"Error {(int)r.StatusCode}"; }
            }
            catch (TaskCanceledException) { statusBadge.SetStatus("Timed Out", BrandColors.Danger); statusLabel.ForeColor = BrandColors.Danger; statusLabel.Text = "Connection timed out."; }
            catch (HttpRequestException ex) { statusBadge.SetStatus("Failed", BrandColors.Danger); statusLabel.ForeColor = BrandColors.Danger; statusLabel.Text = ex.Message; }
            catch (Exception ex) { statusBadge.SetStatus("Failed", BrandColors.Danger); statusLabel.ForeColor = BrandColors.Danger; statusLabel.Text = ex.Message; }
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
        private Label alertTimerLabel;
        private System.Windows.Forms.Timer flashTimer, pulseTimer, countdownTimer;
        private bool isRed;
        private float pulseOpacity = 0f;
        private bool pulseUp = true;
        private DateTime alertStartTime;

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
            alertTimerLabel = new Label()
            {
                Text = "",
                Font = new Font("Segoe UI", (float)(screenH * 0.01), FontStyle.Regular),
                ForeColor = Color.FromArgb(180, 180, 180),
                Location = new Point((int)(screenH * 0.82), (int)(screenH * 0.014)),
                AutoSize = true, BackColor = Color.Transparent, Visible = false
            };
            brandedHeader.Controls.Add(headerLogo);
            brandedHeader.Controls.Add(brandLabel);
            brandedHeader.Controls.Add(alertTimerLabel);

            alertLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Top, Height = (int)(screenH * 0.18),
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Arial Black", (float)(screenH * 0.06), FontStyle.Bold),
                ForeColor = Color.White, BackColor = Color.Transparent, Visible = false
            };

            messageLabel = new Label()
            {
                AutoSize = false, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", (float)(screenH * 0.028), FontStyle.Regular), ForeColor = Color.White,
                BackColor = Color.Transparent, Padding = new Padding(50, 0, 50, 40), Visible = false
            };

            // Bottom panel — use fixed 140px height (safe on all screens)
            // Button auto-sized to fit text
            int bottomH = 140;
            var dismissFont = new Font("Segoe UI", 18, FontStyle.Bold);
            int btnW = TextRenderer.MeasureText("ACKNOWLEDGE && DISMISS", dismissFont).Width + 60;
            int btnH = 60;

            dismissButton = new RoundButton()
            {
                Text = "ACKNOWLEDGE && DISMISS",
                Size = new Size(btnW, btnH),
                BackColor = Color.FromArgb(230, Color.White),
                ForeColor = Color.FromArgb(30, 30, 30),
                Font = dismissFont,
                Visible = false, Cursor = Cursors.Hand, Anchor = AnchorStyles.None
            };
            dismissButton.Click += (s, e) => Dismiss();

            var bottomPanel = new Panel() { Dock = DockStyle.Bottom, Height = bottomH, BackColor = Color.Transparent };
            bottomPanel.Controls.Add(dismissButton);

            var escHint = new Label()
            {
                Text = "Press ESC or click to dismiss",
                Font = new Font("Segoe UI", 11, FontStyle.Italic),
                ForeColor = Color.FromArgb(120, 120, 120),
                Location = new Point(0, bottomH - 30),
                Width = bottomPanel.Width, Height = 24,
                TextAlign = ContentAlignment.MiddleCenter, Anchor = AnchorStyles.Left | AnchorStyles.Right,
                BackColor = Color.Transparent
            };
            bottomPanel.Controls.Add(escHint);

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
            };

            pulseTimer = new System.Windows.Forms.Timer { Interval = 30 };
            pulseTimer.Tick += (s, e) =>
            {
                if (pulseUp) { pulseOpacity += 0.02f; if (pulseOpacity >= 0.25f) pulseUp = false; }
                else { pulseOpacity -= 0.02f; if (pulseOpacity <= 0.05f) pulseUp = true; }
                this.Refresh();
            };

            countdownTimer = new System.Windows.Forms.Timer { Interval = 1000 };
            countdownTimer.Tick += (s, e) => UpdateAlertTimer();

            this.Resize += (s, e) => CenterDismiss();
            this.Load += (s, e) => CenterDismiss();
            this.Paint += (s, e) =>
            {
                if (pulseTimer.Enabled && this.Tag is Color[] colors && colors.Length >= 2)
                {
                    int alpha = Math.Max(0, Math.Min(255, (int)(pulseOpacity * 255)));
                    using var b = new SolidBrush(Color.FromArgb(alpha, 255, 255, 255));
                    e.Graphics.FillRectangle(b, this.ClientRectangle);
                }
            };
        }

        private void CenterDismiss()
        {
            if (dismissButton?.Parent == null) return;
            dismissButton.Location = new Point(
                (ClientSize.Width - dismissButton.Width) / 2,
                (dismissButton.Parent.Height - dismissButton.Height) / 2 - 10);
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
            pulseTimer.Start();
            AlarmPlayer.PlayAlarm();

            alertStartTime = DateTime.Now;
            alertTimerLabel.Visible = true;
            countdownTimer.Start();
            UpdateAlertTimer();

            if (!this.Visible) this.Show();
            this.Activate();
            this.TopMost = true;
            this.BringToFront();
            this.Focus();
            CenterDismiss();
        }

        private void UpdateAlertTimer()
        {
            var elapsed = DateTime.Now - alertStartTime;
            alertTimerLabel.Text = $"Active for {elapsed.Hours:D2}:{elapsed.Minutes:D2}:{elapsed.Seconds:D2}";
        }

        private void Dismiss()
        {
            flashTimer.Stop(); pulseTimer.Stop(); countdownTimer.Stop();
            AlarmPlayer.StopAlarm();
            pulseOpacity = 0f;
            this.BackColor = Color.Black; brandedHeader.Visible = false;
            alertLabel.Visible = false; messageLabel.Visible = false; dismissButton.Visible = false;
            alertTimerLabel.Visible = false;
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
        private static readonly Version CurrentVersion = Assembly.GetExecutingAssembly().GetName().Version ?? new(1, 0, 0, 0);
        private static readonly string UpdateUrl = "https://staging.fivestonestechnology.com/api/ras/update/version.json";

        public TrayApplication()
        {
            AlarmPlayer.Initialize();
            settings = SettingsManager.Load();
            trayIcon = new NotifyIcon() { Icon = LoadTrayIcon(), Text = "Five Stones RAS - Monitoring", Visible = true };
            var menu = new ContextMenuStrip();
            menu.Items.Add("● Monitoring", null, (s, e) => { });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("\u2699 Settings...", null, (s, e) => ShowSettings());
            menu.Items.Add("\U0001f514 Test Alert", null, (s, e) => { if (!hasActiveAlert) TriggerAlert("TEST ALERT", "Test alert from tray menu.", "lockdown"); });
            menu.Items.Add("\u21bb Check for Updates", null, async (s, e) => await CheckForUpdates(true));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit", null, (s, e) => { pollTimer?.Stop(); updateTimer?.Stop(); AlarmPlayer.Cleanup(); trayIcon.Visible = false; Application.Exit(); });
            trayIcon.ContextMenuStrip = menu;
            trayIcon.DoubleClick += (s, e) => ShowSettings();
            SettingsManager.ApplyAutoStart(settings.AutoStart);

            if (string.IsNullOrEmpty(settings.ApiKey) || settings.OrgId == 0)
            { trayIcon.Text = "Five Stones RAS - Not configured"; menu.Items[0].Text = "\u25cb Not configured"; }
            else { trayIcon.Text = "Five Stones RAS - Connected"; menu.Items[0].Text = "\u25cf Connected"; }

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
                trayIcon.ContextMenuStrip.Items[0].Text = "\u25cf Connected";
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
                else if (r.StatusCode == System.Net.HttpStatusCode.Unauthorized || r.StatusCode == System.Net.HttpStatusCode.Forbidden)
                {
                    if (!_keyRotationNotified)
                    {
                        _keyRotationNotified = true;
                        trayIcon.ShowBalloonTip(30000, "API Key Expired",
                            "Your RAS Desktop Alert API key has expired or been revoked. Open Settings to reconfigure.",
                            ToolTipIcon.Error);
                        trayIcon.Text = "Five Stones RAS - Key Expired";
                        trayIcon.ContextMenuStrip.Items[0].Text = "\u2717 Key Expired";
                    }
                }
            }
            catch { }
        }

        private bool _keyRotationNotified = false;

        private void TriggerAlert(string alertType, string message, string rawType)
        {
            if (alertForm == null || alertForm.IsDisposed) alertForm = new AlertForm();
            alertForm.ShowAlert(alertType, message, rawType);
            trayIcon.Text = "\u26a0\ufe0f ALERT: " + alertType;
            trayIcon.ContextMenuStrip.Items[0].Text = "\u26a0 ALERT";
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