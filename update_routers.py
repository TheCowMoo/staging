import sys

with open('server/routers.ts', 'r', encoding='utf-8') as f:
    content = f.read()

def nth_replace(src, old, new, n):
    """Replace the nth occurrence of old with new in src."""
    idx = -1
    for i in range(n):
        idx = src.find(old, idx + 1)
        if idx == -1:
            return src, False
    return src[:idx] + new + src[idx + len(old):], True

# 1. facility.create: emergencyCoordinator...operationalPolicies (unique)
old1 = 'emergencyCoordinator: z.string().optional(),\n      operationalPolicies: z.string().optional()'
new1 = 'emergencyCoordinator: z.string().optional(),\n      latitude: z.number().optional(),\n      longitude: z.number().optional(),\n      operationalPolicies: z.string().optional()'
content, ok = nth_replace(content, old1, new1, 1)
print(f'1. facility.create: {"OK" if ok else "FAILED"}')

# 2. facility.update: emergencyCoordinator...emergencyRoles (first occurrence in update, which is 1st overall for this pattern)
#    onboarding.submitProfile: emergencyCoordinator...emergencyRoles (2nd occurrence overall)
old23 = 'emergencyCoordinator: z.string().optional(),\n      emergencyRoles: z.string().optional()'
new23 = 'emergencyCoordinator: z.string().optional(),\n      latitude: z.number().optional(),\n      longitude: z.number().optional(),\n      emergencyRoles: z.string().optional()'

# Update first occurrence (facility.update)
content, ok = nth_replace(content, old23, new23, 1)
print(f'2. facility.update: {"OK" if ok else "FAILED"}')

# Update second occurrence (onboarding.submitProfile)
content, ok = nth_replace(content, old23, new23, 2)
print(f'3. onboarding.submitProfile: {"OK" if ok else "FAILED"}')

with open('server/routers.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')