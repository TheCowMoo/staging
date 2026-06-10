"""
Update FacilityOnboarding.tsx to:
1. Import MapPicker
2. Add latitude/longitude to FormData + empty()
3. Add MapPicker to Step 1
4. Submit lat/lng
"""
import re

# === FACILITY ONBOARDING ===
with open('client/src/pages/FacilityOnboarding.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add import for MapPicker
old_import = "import { toast } from \"sonner\";"
new_import = 'import MapPicker from "@/components/MapPicker";\nimport { toast } from "sonner";'
c = c.replace(old_import, new_import, 1)

# 2. Add latitude/longitude to FormData interface
old_fd = "  // Step 1 — Identity\n  name: string;"
new_fd = "  // Step 1 — Identity\n  latitude: number | null;\n  longitude: number | null;\n  name: string;"
c = c.replace(old_fd, new_fd, 1)

# 3. Add lat/lng to empty()
old_empty = "  name: \"\", facilityType"
new_empty = "  latitude: null, longitude: null, name: \"\", facilityType"
c = c.replace(old_empty, new_empty, 1)

# 4. Add MapPicker after jurisdiction select + add lat/lng state
old_jurisdiction_end = "</Select>\n                </div>\n              </>\n            )}"
new_jurisdiction_end = '</Select>\n                </div>\n\n                {/* Map Picker */}\n                <MapPicker\n                  initialLat={form.latitude}\n                  initialLng={form.longitude}\n                  initialAddress={`${form.address}, ${form.city}, ${form.state}`}\n                  onChange={(result) => {\n                    setForm(f => ({ ...f, latitude: result.lat, longitude: result.lng, address: result.address }));\n                  }}\n                />\n              </>\n            )}'
c = c.replace(old_jurisdiction_end, new_jurisdiction_end, 1)

# 5. Add lat/lng to submit mutation
old_submit_lat = "                emergencyCoordinator: form.emergencyCoordinator.trim() || undefined,"
new_submit_lat = "                latitude: form.latitude ?? undefined,\n                longitude: form.longitude ?? undefined,\n                emergencyCoordinator: form.emergencyCoordinator.trim() || undefined,"
c = c.replace(old_submit_lat, new_submit_lat, 1)

with open('client/src/pages/FacilityOnboarding.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('FacilityOnboarding.tsx updated')

# === FACILITY DETAIL ===
with open('client/src/pages/FacilityDetail.tsx', 'r', encoding='utf-8') as f:
    d = f.read()

# 1. Add MapPicker import
old_import_d = "import { toast } from \"sonner\";"
new_import_d = 'import MapPicker from "@/components/MapPicker";\nimport { toast } from "sonner";'
d = d.replace(old_import_d, new_import_d, 1)

# 2. Replace the old static Google Maps iframe with MapPicker in view mode
old_iframe = '''              {/* $$ Facility Mapping (inline) $$ */}
              <div className="mt-3 border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setMapOpen(!mapOpen)}
                  className="w-full px-3 py-2 bg-muted/40 border-b border-border flex items-center gap-1.5 hover:bg-muted/60 transition-colors text-left"
                >
                  {mapOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <MapIcon size={13} className="text-primary" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Facility Mapping</span>
                </button>
                {mapOpen && (
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground mb-2">Facility location on map (based on address).</p>
                    <div className="rounded-lg overflow-hidden border border-border">
                      <iframe
                        title="Facility Map"
                        width="100%"
                        height="250"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://www.google.com/maps?q=${encodeURIComponent(
                          [facility.address, facility.city, facility.state].filter(Boolean).join(", ")
                        )}&output=embed`}
                      />
                    </div>
                  </div>
                )}
              </div>'''
new_iframe = '''              {/* $$ Facility Mapping (inline) $$ */}
              <div className="mt-3 border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setMapOpen(!mapOpen)}
                  className="w-full px-3 py-2 bg-muted/40 border-b border-border flex items-center gap-1.5 hover:bg-muted/60 transition-colors text-left"
                >
                  {mapOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <MapIcon size={13} className="text-primary" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Facility Mapping</span>
                </button>
                {mapOpen && (
                  <div className="p-3">
                    <MapPicker
                      initialLat={(facility as any).latitude}
                      initialLng={(facility as any).longitude}
                      initialAddress={[facility.address, facility.city, facility.state].filter(Boolean).join(", ")}
                      onChange={() => {}}
                    />
                  </div>
                )}
              </div>'''
d = d.replace(old_iframe, new_iframe, 1)

# 3. Add latitude/longitude to edit form state
old_edit_emergency = "      emergencyRoles: facility.emergencyRoles ?? \"\","
new_edit_emergency = "      emergencyRoles: facility.emergencyRoles ?? \"\",\n      latitude: (facility as any).latitude ?? null,\n      longitude: (facility as any).longitude ?? null,"
d = d.replace(old_edit_emergency, new_edit_emergency, 1)

# 4. Add MapPicker to edit mode (before Operational Policies)
old_edit_admin = "                  {/* $$ Administration $$ */}"
new_edit_map_first = '''                  {/* $$ Map Location $$ */}
                  <div className="space-y-4 pt-2 border-t border-border">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Map Location</h3>
                    <MapPicker
                      initialLat={editForm.latitude as number | null}
                      initialLng={editForm.longitude as number | null}
                      initialAddress={[editForm.address as string, editForm.city as string, editForm.state as string].filter(Boolean).join(", ")}
                      onChange={(result) => setEditForm({ ...editForm, latitude: result.lat, longitude: result.lng, address: result.address })}
                    />
                  </div>

                  {/* $$ Administration $$ }}}'''
d = d.replace(old_edit_admin, new_edit_map_first, 1)

# 5. Add lat/lng to save mutation
old_save_emergency = "      emergencyRoles: editForm.emergencyRoles || undefined,"
new_save_emergency = "      latitude: editForm.latitude ?? undefined,\n      longitude: editForm.longitude ?? undefined,\n      emergencyRoles: editForm.emergencyRoles || undefined,"
d = d.replace(old_save_emergency, new_save_emergency, 1)

with open('client/src/pages/FacilityDetail.tsx', 'w', encoding='utf-8') as f:
    f.write(d)
print('FacilityDetail.tsx updated')