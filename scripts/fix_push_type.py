with open('server/push.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old = 'alertType: "lockdown" | "lockout";'
new = 'alertType: "lockdown" | "lockout" | "fire" | "weather";'
if old in content:
    content = content.replace(old, new)
    with open('server/push.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK - push.ts type expanded')
else:
    print('NOT FOUND in push.ts')