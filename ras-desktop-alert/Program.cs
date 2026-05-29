using System;
using System.Drawing;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace RasDesktopAlert
{
    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new TrayApplication());
        }
    }

    // ─── SETTINGS FORM ──────────────────────────────────────────────────────────
    public class SettingsForm : Form
    {
        private TextBox apiUrlBox;
        private TextBox apiKeyBox;
        private NumericUpDown orgIdBox;

        public string ApiBaseUrl { get => apiUrlBox.Text.Trim(); set => apiUrlBox.Text = value; }
        public string ApiKey { get => apiKeyBox.Text.Trim(); set => apiKeyBox.Text = value; }
        public int OrgId { get => (int)orgIdBox.Value; set => orgIdBox.Value = value; }

        public SettingsForm()
        {
            this.Text = "RAS Alert - Settings";
            this.Size = new Size(500, 260);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;

            var mainPanel = new TableLayoutPanel()
            { Dock = DockStyle.Fill, Padding = new Padding(20), ColumnCount = 2, RowCount = 4,
              ColumnStyles = { new ColumnStyle(SizeType.Absolute, 110), new ColumnStyle(SizeType.Percent, 100) },
              RowStyles = { new RowStyle(SizeType.Absolute, 40), new RowStyle(SizeType.Absolute, 40), new RowStyle(SizeType.Absolute, 40), new RowStyle(SizeType.Absolute, 60) } };

            mainPanel.Controls.Add(new Label() { Text = "API URL:", TextAlign = ContentAlignment.MiddleRight, Anchor = AnchorStyles.Right, Font = new Font("Segoe UI", 10) }, 0, 0);
            apiUrlBox = new TextBox() { Text = "https://staging.fivestonestechnology.com", Dock = DockStyle.Fill, Font = new Font("Segoe UI", 10), Margin = new Padding(5, 5, 0, 5) };
            mainPanel.Controls.Add(apiUrlBox, 1, 0);

            mainPanel.Controls.Add(new Label() { Text = "API Key:", TextAlign = ContentAlignment.MiddleRight, Anchor = AnchorStyles.Right, Font = new Font("Segoe UI", 10) }, 0, 1);
            apiKeyBox = new TextBox() { PasswordChar = '*', Dock = DockStyle.Fill, Font = new Font("Segoe UI", 10), Margin = new Padding(5, 5, 0, 5) };
            mainPanel.Controls.Add(apiKeyBox, 1, 1);

            mainPanel.Controls.Add(new Label() { Text = "Org ID:", TextAlign = ContentAlignment.MiddleRight, Anchor = AnchorStyles.Right, Font = new Font("Segoe UI", 10) }, 0, 2);
            orgIdBox = new NumericUpDown() { Minimum = 1, Maximum = 999999, Width = 120, Font = new Font("Segoe UI", 10), Margin = new Padding(5, 5, 0, 5) };
            mainPanel.Controls.Add(orgIdBox, 1, 2);

            var buttonPanel = new FlowLayoutPanel() { Dock = DockStyle.Fill, FlowDirection = FlowDirection.RightToLeft, Margin = new Padding(0, 10, 0, 0) };
            var saveBtn = new Button() { Text = "Save & Connect", Size = new Size(130, 35), Font = new Font("Segoe UI", 10, FontStyle.Bold), FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(11, 31, 51), ForeColor = Color.White, FlatAppearance = { BorderSize = 0 }, Cursor = Cursors.Hand };
            saveBtn.Click += (s, e) => { if (string.IsNullOrWhiteSpace(apiUrlBox.Text) || string.IsNullOrWhiteSpace(apiKeyBox.Text)) { MessageBox.Show("Please fill all fields.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Warning); return; } DialogResult = DialogResult.OK; Close(); };
            var cancelBtn = new Button() { Text = "Cancel", Size = new Size(100, 35), Font = new Font("Segoe UI", 10), Cursor = Cursors.Hand };
            cancelBtn.Click += (s, e) => { DialogResult = DialogResult.Cancel; Close(); };
            buttonPanel.Controls.Add(saveBtn); buttonPanel.Controls.Add(cancelBtn);
            mainPanel.Controls.Add(buttonPanel, 1, 3);

            this.Controls.Add(mainPanel);
            this.Controls.Add(new Label() { Text = "Get API key from Dashboard > Admin > API Keys.", Dock = DockStyle.Bottom, TextAlign = ContentAlignment.MiddleLeft, Font = new Font("Segoe UI", 8, FontStyle.Italic), ForeColor = Color.Gray, Height = 25, Padding = new Padding(20, 0, 0, 0) });
            this.AcceptButton = saveBtn; this.CancelButton = cancelBtn;
        }
    }

    // ─── ALERT FORM ─────────────────────────────────────────────────────────────
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

            alertLabel = new Label() { AutoSize = false, Dock = DockStyle.Top, Height = 150, TextAlign = ContentAlignment.MiddleCenter, Font = new Font("Arial Black", 56, FontStyle.Bold), ForeColor = Color.White, BackColor = Color.Transparent, Visible = false };
            messageLabel = new Label() { AutoSize = false, Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleCenter, Font = new Font("Segoe UI", 28, FontStyle.Regular), ForeColor = Color.White, BackColor = Color.Transparent, Padding = new Padding(60), Visible = false };

            dismissButton = new Button() { Text = "ACKNOWLEDGE & DISMISS", FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(220, Color.White), ForeColor = Color.Black, Font = new Font("Arial", 16, FontStyle.Bold), Size = new Size(350, 70), FlatAppearance = { BorderSize = 0 }, Visible = false, Cursor = Cursors.Hand };
            dismissButton.Click += (s, e) => Dismiss();

            var bottomPanel = new Panel() { Dock = DockStyle.Bottom, Height = 120, BackColor = Color.Transparent };
            dismissButton.Location = new Point((Screen.PrimaryScreen.Bounds.Width - dismissButton.Width) / 2, 25);
            dismissButton.Anchor = AnchorStyles.None;
            bottomPanel.Controls.Add(dismissButton);

            this.Controls.Add(messageLabel); this.Controls.Add(alertLabel); this.Controls.Add(bottomPanel);

            flashTimer = new System.Windows.Forms.Timer { Interval = 600 };
            flashTimer.Tick += (s, e) => { isRed = !isRed; var c = (Color[])this.Tag; this.BackColor = isRed ? c[0] : c[1]; this.Refresh(); };
        }

        public void ShowAlert(string alertType, string message, string rawType)
        {
            Color c1, c2; string icon;
            switch (rawType.ToLower())
            {
                case "lockdown": c1 = Color.FromArgb(220, 38, 38); c2 = Color.Black; icon = "🔒"; break;
                case "fire": c1 = Color.FromArgb(234, 88, 12); c2 = Color.FromArgb(220, 38, 38); icon = "🔥"; break;
                case "weather": c1 = Color.FromArgb(37, 99, 235); c2 = Color.FromArgb(29, 78, 216); icon = "🌪️"; break;
                case "lockout": c1 = Color.FromArgb(234, 88, 12); c2 = Color.Black; icon = "🚪"; break;
                default: c1 = Color.Red; c2 = Color.DarkRed; icon = "⚠️"; break;
            }

            alertLabel.Text = $"{icon}  {alertType}"; alertLabel.Visible = true;
            messageLabel.Text = message; messageLabel.Visible = true;
            dismissButton.Visible = true; dismissButton.BringToFront();
            isRed = true; this.BackColor = c1;
            this.Tag = new Color[] { c1, c2 };
            flashTimer.Start();
            if (!this.Visible) this.Show();
            this.Activate(); this.TopMost = true; this.BringToFront();
        }

        private void Dismiss() { flashTimer.Stop(); this.BackColor = Color.Black; alertLabel.Visible = false; messageLabel.Visible = false; dismissButton.Visible = false; this.Hide(); }
        protected override bool ProcessCmdKey(ref Message msg, Keys keyData) { if (keyData == Keys.Escape) { Dismiss(); return true; } return base.ProcessCmdKey(ref msg, keyData); }
    }

    // ─── API MODEL ──────────────────────────────────────────────────────────────
    public class RasAlert { public string Type { get; set; } public string Message { get; set; } public string Status { get; set; } }

    // ─── TRAY APPLICATION ───────────────────────────────────────────────────────
    public class TrayApplication : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private AlertForm alertForm;
        private System.Windows.Forms.Timer pollTimer;
        private string apiBaseUrl = "https://staging.fivestonestechnology.com";
        private string apiKey = "";
        private int orgId = 0;
        private bool hasActiveAlert = false;
        private bool settingsShowing = false;

        public TrayApplication()
        {
            trayIcon = new NotifyIcon() { Icon = SystemIcons.Shield, Text = "Five Stones RAS - Monitoring", Visible = true };

            var menu = new ContextMenuStrip();
            menu.Items.Add("Status: Monitoring", null, (s, e) => { });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Settings...", null, (s, e) => ShowSettings());
            menu.Items.Add("Test Alert", null, (s, e) => { if (!hasActiveAlert) TriggerAlert("TEST ALERT", "This is a test alert.", "lockdown"); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit", null, (s, e) => { pollTimer?.Stop(); trayIcon.Visible = false; Application.Exit(); });
            trayIcon.ContextMenuStrip = menu;
            trayIcon.DoubleClick += (s, e) => ShowSettings();

            alertForm = new AlertForm();

            // Show settings on first launch (after a short delay)
            System.Windows.Forms.Timer firstRunTimer = new System.Windows.Forms.Timer { Interval = 500 };
            firstRunTimer.Tick += (s, e) => { firstRunTimer.Stop(); if (string.IsNullOrEmpty(apiKey)) ShowSettings(); };
            firstRunTimer.Start();

            pollTimer = new System.Windows.Forms.Timer { Interval = 5000 };
            pollTimer.Tick += async (s, e) => await PollForAlert();
            pollTimer.Start();
        }

        private void ShowSettings()
        {
            if (settingsShowing) return;
            settingsShowing = true;
            var form = new SettingsForm() { ApiBaseUrl = apiBaseUrl, ApiKey = apiKey, OrgId = orgId };
            if (form.ShowDialog() == DialogResult.OK)
            {
                apiBaseUrl = form.ApiBaseUrl; apiKey = form.ApiKey; orgId = form.OrgId;
                trayIcon.Text = "Five Stones RAS - Connected";
                trayIcon.ContextMenuStrip.Items[0].Text = "Status: Connected";
            }
            settingsShowing = false;
        }

        private async Task PollForAlert()
        {
            if (string.IsNullOrEmpty(apiKey) || orgId == 0) return;
            try
            {
                using var client = new HttpClient();
                client.DefaultRequestHeaders.Add("X-Api-Key", apiKey);
                client.Timeout = TimeSpan.FromSeconds(5);
                var response = await client.GetAsync($"{apiBaseUrl}/api/ras/alerts/active?orgId={orgId}");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var alert = JsonSerializer.Deserialize<RasAlert>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (alert != null && alert.Status != "resolved" && !hasActiveAlert) { hasActiveAlert = true; TriggerAlert(alert.Type.ToUpper(), alert.Message, alert.Type); }
                    else if (alert == null || alert.Status == "resolved") { if (hasActiveAlert) { hasActiveAlert = false; alertForm.Hide(); trayIcon.Text = "Five Stones RAS - Monitoring"; } }
                }
            }
            catch { /* retry on next poll */ }
        }

        private void TriggerAlert(string alertType, string message, string rawType)
        {
            alertForm.ShowAlert(alertType, message, rawType);
            trayIcon.Text = $"⚠️ ALERT: {alertType}";
            trayIcon.ShowBalloonTip(15000, "⚠️ EMERGENCY ALERT", $"{alertType}: {message}", ToolTipIcon.Warning);
        }
    }
}