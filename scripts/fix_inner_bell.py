with open('client/src/components/AppLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = '<Link href="/ras" className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">\n            <Bell className="w-4 h-4" />\n            Notifications\n          </Link>'
new = '<NotificationBell />'

if old in content:
    content = content.replace(old, new)
    with open('client/src/components/AppLayout.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK - inner header notif link replaced')
else:
    print('NOT FOUND - searching for match...')
    import re
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'ml-auto' in line and 'Notifications' in lines[min(i+2, len(lines)-1)] if i < len(lines) else '':
            print(f'Line {i}: {line}')
            print(f'Line {i+1}: {lines[i+1]}')
            print(f'Line {i+2}: {lines[i+2]}')