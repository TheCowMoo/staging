# Wire notification router into server/routers.ts
with open('server/routers.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
old = 'import { incidentCommunicationRouter } from "./incidentCommunicationRouter";'
new = 'import { incidentCommunicationRouter } from "./incidentCommunicationRouter";\nimport { notificationRouter } from "./notificationRouter";'
if old in content:
    content = content.replace(old, new)
else:
    print("ERROR: import line not found")

# Add to appRouter
old2 = 'incidentCommunication: incidentCommunicationRouter,'
new2 = 'incidentCommunication: incidentCommunicationRouter,\n  notification: notificationRouter,'
if old2 in content:
    content = content.replace(old2, new2)
else:
    print("ERROR: appRouter line not found")

with open('server/routers.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("OK - router wired")

# Wire the NotificationBell into AppLayout
with open('client/src/components/AppLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for NotificationBell
old3 = 'import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal";'
new3 = 'import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal";\nimport { NotificationBell } from "@/components/NotificationBell";'
if old3 in content:
    content = content.replace(old3, new3)
else:
    print("ERROR: PrivacyPolicyModal import not found")

# Replace the Bell link in the mobile header with NotificationBell
old4 = '''          <Link href="/ras" className="ml-auto inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">
            <Bell size={18} />
          </Link>'''
new4 = '''          <div className="ml-auto">
            <NotificationBell />
          </div>'''
if old4 in content:
    content = content.replace(old4, new4)
    print("Bell link replaced")
else:
    print("ERROR: Bell link not found - trying alternate pattern")
    # Try for the logged-in header bell pattern
    alt4 = '''          <Link href="/ras" className="ml-auto inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">
            <Bell size={18} />
          </Link>'''
    alt4_new = '''          <div className="ml-auto">
            <NotificationBell />
          </div>'''
    if alt4 in content:
        content = content.replace(alt4, alt4_new)
        print("Bell link replaced (alt)")

with open('client/src/components/AppLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("OK - AppLayout wired")

# Create the migration SQL file
migration_sql = """-- Notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `org_id` int,
  `type` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text,
  `link` varchar(512),
  `metadata` json,
  `read` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_read` (`user_id`, `read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

with open('drizzle/0035_notifications.sql', 'w', encoding='utf-8') as f:
    f.write(migration_sql)

print("OK - migration created")