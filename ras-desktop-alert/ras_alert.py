"""
Five Stones RAS Desktop Alert
Runs in system tray, polls API for active alerts, shows full-screen flashing window.
Compile with: pyinstaller --onefile --noconsole --name FiveStonesRASAlert ras_alert.py
"""
import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import json
import urllib.request
import urllib.error
import sys
import os
import webbrowser
from datetime import datetime

# Try to import pystray (system tray support)
try:
    from PIL import Image, ImageDraw
    import pystray
    HAS_TRAY = True
except ImportError:
    HAS_TRAY = False
    print("pystray not installed. Install with: pip install pystray Pillow")
    # Fallback: just run as a normal window
    try:
        import pystray
    except:
        pass


class SettingsDialog:
    def __init__(self, parent):
        self.result = None
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("RAS Alert - Settings")
        self.dialog.geometry("480x250")
        self.dialog.resizable(False, False)
        self.dialog.transient(parent)
        self.dialog.grab_set()

        # Load saved settings
        saved = self.load_settings()

        frame = ttk.Frame(self.dialog, padding=20)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="API URL:").grid(row=0, column=0, sticky="e", padx=(0, 10), pady=8)
        self.api_url = ttk.Entry(frame, width=50)
        self.api_url.insert(0, saved.get("api_url", "https://api.fivestonestechnology.com"))
        self.api_url.grid(row=0, column=1, pady=8)

        ttk.Label(frame, text="API Key:").grid(row=1, column=0, sticky="e", padx=(0, 10), pady=8)
        self.api_key = ttk.Entry(frame, width=50, show="*")
        self.api_key.insert(0, saved.get("api_key", ""))
        self.api_key.grid(row=1, column=1, pady=8)

        ttk.Label(frame, text="Org ID:").grid(row=2, column=0, sticky="e", padx=(0, 10), pady=8)
        self.org_id = ttk.Entry(frame, width=50)
        self.org_id.insert(0, str(saved.get("org_id", "")))
        self.org_id.grid(row=2, column=1, pady=8)

        ttk.Label(frame, text="Check interval (seconds):").grid(row=3, column=0, sticky="e", padx=(0, 10), pady=8)
        self.interval = ttk.Entry(frame, width=10)
        self.interval.insert(0, str(saved.get("interval", 5)))
        self.interval.grid(row=3, column=1, sticky="w", pady=8)

        # Button frame
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=4, column=0, columnspan=2, pady=(15, 0))

        ttk.Button(btn_frame, text="Save & Connect", command=self.on_save).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Cancel", command=self.on_cancel).pack(side="left", padx=5)

        # Info text
        info = ttk.Label(frame, text="Get API key from Dashboard > Admin > API Keys",
                         foreground="gray", font=("", 8))
        info.grid(row=5, column=0, columnspan=2, pady=(10, 0))

        self.dialog.protocol("WM_DELETE_WINDOW", self.on_cancel)
        self.dialog.wait_visibility()
        self.dialog.wait_window()

    def load_settings(self):
        try:
            path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ras_settings.json")
            with open(path, "r") as f:
                return json.load(f)
        except:
            return {}

    def save_settings(self, data):
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ras_settings.json")
        with open(path, "w") as f:
            json.dump(data, f)

    def on_save(self):
        url = self.api_url.get().strip()
        key = self.api_key.get().strip()
        org = self.org_id.get().strip()
        interval = self.interval.get().strip()

        if not url or not key or not org:
            messagebox.showwarning("Validation Error", "API URL, API Key, and Org ID are required.")
            return

        try:
            int(org)
        except:
            messagebox.showwarning("Validation Error", "Org ID must be a number.")
            return

        try:
            int(interval)
        except:
            messagebox.showwarning("Validation Error", "Interval must be a number.")
            return

        data = {"api_url": url, "api_key": key, "org_id": int(org), "interval": int(interval)}
        self.save_settings(data)
        self.result = data
        self.dialog.destroy()

    def on_cancel(self):
        self.result = None
        self.dialog.destroy()


class AlertWindow:
    """Full-screen alert window with flashing colors"""
    def __init__(self, root):
        self.root = root
        self.window = None
        self.flash_active = False

    def show_alert(self, alert_type, message, raw_type):
        if self.window and self.window.winfo_exists():
            return

        self.window = tk.Toplevel(self.root)
        self.window.attributes("-fullscreen", True)
        self.window.attributes("-topmost", True)
        self.window.focus_force()

        # Color scheme per alert type
        colors = {
            "lockdown": ("#DC2626", "#000000", "🔒"),
            "fire": ("#EA580C", "#DC2626", "🔥"),
            "weather": ("#2563EB", "#1D4ED8", "🌪️"),
            "lockout": ("#EA580C", "#000000", "🚪"),
        }
        c1, c2, icon = colors.get(raw_type, ("#DC2626", "#000000", "⚠️"))

        # Header label
        header = tk.Label(self.window, text=f"{icon}  {alert_type}",
                          font=("Arial Black", 56, "bold"),
                          fg="white", bg=c1)
        header.pack(fill="x", pady=(80, 0))

        # Message label
        msg = tk.Label(self.window, text=message,
                       font=("Segoe UI", 28),
                       fg="white", bg=c1,
                       wraplength=self.window.winfo_screenwidth() - 100)
        msg.pack(fill="both", expand=True, padx=50, pady=30)

        # Dismiss button
        btn_frame = tk.Frame(self.window, bg=c1)
        btn_frame.pack(side="bottom", pady=50)

        dismiss_btn = tk.Button(btn_frame, text="ACKNOWLEDGE & DISMISS",
                                font=("Arial", 16, "bold"),
                                bg="white", fg="black",
                                padx=40, pady=15, cursor="hand2",
                                command=self.dismiss)
        dismiss_btn.pack()

        # Bind ESC to dismiss
        self.window.bind("<Escape>", lambda e: self.dismiss())

        # Flash effect
        self.flash_active = True
        colors_list = [c1, c2]

        def flash():
            idx = 0
            while self.flash_active:
                try:
                    bg = colors_list[idx % 2]
                    header.config(bg=bg)
                    msg.config(bg=bg)
                    btn_frame.config(bg=bg)
                    self.window.config(bg=bg)
                    self.window.update()
                    time.sleep(0.6)
                    idx += 1
                except:
                    break

        threading.Thread(target=flash, daemon=True).start()

    def dismiss(self):
        self.flash_active = False
        if self.window and self.window.winfo_exists():
            self.window.destroy()
        self.window = None


class TrayApp:
    def __init__(self, root):
        self.root = root
        self.root.withdraw()  # Hide the main tkinter window
        self.root.protocol("WM_DELETE_WINDOW", self.on_exit)

        self.settings = None
        self.running = True
        self.has_active_alert = False
        self.alert_window = AlertWindow(root)

        # Load settings
        self.load_settings()

        # Show settings if not configured
        if not self.settings:
            self.show_settings()
        else:
            self.start_polling()

        # Create system tray icon if supported
        if HAS_TRAY:
            self.create_tray_icon()
        else:
            # Fallback: show window with controls
            self.show_control_window()

    def load_settings(self):
        try:
            path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ras_settings.json")
            with open(path, "r") as f:
                self.settings = json.load(f)
        except:
            self.settings = None

    def show_settings(self):
        result = SettingsDialog(self.root).result
        if result:
            self.settings = result
            self.start_polling()
        else:
            # Keep trying on next launch
            pass

    def start_polling(self):
        if self.settings:
            interval = self.settings.get("interval", 5)
            threading.Thread(target=self.poll_loop, args=(interval,), daemon=True).start()

    def poll_loop(self, interval):
        while self.running:
            try:
                self.check_for_alert()
            except Exception as e:
                print(f"Poll error: {e}")
            time.sleep(interval)

    def check_for_alert(self):
        if not self.settings:
            return

        url = f"{self.settings['api_url']}/api/ras/alerts/active?orgId={self.settings['org_id']}"
        req = urllib.request.Request(url)
        req.add_header("X-Api-Key", self.settings["api_key"])

        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                if data and data.get("status") != "resolved":
                    if not self.has_active_alert:
                        self.has_active_alert = True
                        self.root.after(0, lambda: self.alert_window.show_alert(
                            data.get("type", "ALERT").upper(),
                            data.get("message", ""),
                            data.get("type", "unknown").lower()
                        ))
                else:
                    if self.has_active_alert:
                        self.has_active_alert = False
                        self.root.after(0, lambda: self.alert_window.dismiss())
        except urllib.error.HTTPError as e:
            # 404 = no active alert
            if e.code != 404 and self.has_active_alert:
                self.has_active_alert = False
                self.root.after(0, lambda: self.alert_window.dismiss())
        except:
            pass

    def create_tray_icon(self):
        def on_show(icon, item):
            self.show_settings()

        def on_exit(icon, item):
            self.running = False
            icon.stop()
            self.root.after(100, self.on_exit)

        # Create a simple icon
        image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.ellipse([8, 8, 56, 56], fill="#DC2626", outline="white", width=3)
        draw.text((20, 18), "R", fill="white", font=None)

        menu = (
            pystray.MenuItem("Status: Monitoring", None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Settings", on_show),
            pystray.MenuItem("Test Alert", lambda: self.root.after(0, lambda: self.alert_window.show_alert(
                "TEST ALERT", "This is a test alert.", "lockdown"))),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Exit", on_exit),
        )

        self.tray_icon = pystray.Icon("RAS_Alert", image, "Five Stones RAS - Monitoring", menu)
        threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def show_control_window(self):
        # Fallback window when system tray not available
        self.control_win = tk.Toplevel(self.root)
        self.control_win.title("RAS Desktop Alert")
        self.control_win.geometry("300x200")
        self.control_win.resizable(False, False)

        frame = ttk.Frame(self.control_win, padding=20)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Five Stones RAS Alert",
                  font=("Arial", 12, "bold")).pack(pady=(0, 5))
        ttk.Label(frame, text="Running in background...").pack()
        ttk.Label(frame, text=f"Org: {self.settings.get('org_id', '?')}",
                  foreground="gray").pack(pady=5)

        ttk.Button(frame, text="Settings", command=self.show_settings).pack(pady=2)
        ttk.Button(frame, text="Test Alert", command=lambda: self.alert_window.show_alert(
            "TEST ALERT", "This is a test alert.", "lockdown")).pack(pady=2)
        ttk.Button(frame, text="Exit", command=self.on_exit).pack(pady=(2, 0))

    def on_exit(self):
        self.running = False
        try:
            self.root.destroy()
        except:
            pass
        os._exit(0)


def main():
    root = tk.Tk()
    root.withdraw()
    app = TrayApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()