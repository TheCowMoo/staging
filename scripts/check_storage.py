with open('server/storage.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f'Total lines: {len(lines)}')
for i in range(90, min(100, len(lines))):
    print(f'{i+1}: {lines[i].rstrip()}')
