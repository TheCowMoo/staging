import sys

with open('server/routers.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the third occurrence of emergencyCoordinator (onboarding section)
idx = -1
for i in range(3):
    idx = content.find('emergencyCoordinator', idx + 1)
    if idx == -1:
        print(f'Only found {i} occurrences')
        sys.exit(1)

# Find the preceding comment line
comment_start = content.rfind('//', 0, idx)
start_line = content.rfind('\n', 0, comment_start) + 1

# Find the notes: line end
notes_end = content.find('\n', content.find('notes:', idx)) + 1

old_text = content[start_line:notes_end]

new_text = '      // ── Step 4: Personnel & Contacts ──\n      emergencyCoordinator: z.string().optional(),\n      emergencyRoles: z.string().optional(),\n      aedOnSite: z.boolean().optional(),\n      aedLocations: z.string().optional(),\n      operationalPolicies: z.string().optional(),\n      coordinatorContacts: z.string().optional(),\n      emergencyContacts: z.string().optional(),\n      notes: z.string().optional(),\n'

if old_text in content:
    content = content.replace(old_text, new_text, 1)
    with open('server/routers.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print(f'FAILED: could not find old_text')
    print(f'old_text={repr(old_text)}')