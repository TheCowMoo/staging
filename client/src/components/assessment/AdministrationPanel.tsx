/**
 * AdministrationPanel
 * 
 * Dedicated Administration section for:
 * - Operational Policies (input/uploads)
 * - Coordinator Contacts (roles, names, contacts)
 * - Emergency Contacts (migrated from Facility Profile)
 * - Add Mapping (floor plan upload/coordination)
 * - Photos and Documents (structured file upload grid)
 * - Website Resource Links (OSHA defaults + custom URLs)
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  FileText, Users, Phone, Map, Image, Globe, Plus, Trash2,
  Building2, Shield, ExternalLink, Upload, X
} from "lucide-react";
import { WebsiteResourceLinks } from "./WebsiteResourceLinks";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoordinatorContact {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  type: "primary" | "backup" | "after_hours" | "other";
}

export interface PolicyDocument {
  id: string;
  name: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
}

export interface MapAsset {
  id: string;
  label: string;
  floorNumber: number;
  imageUrl?: string;
}

export interface PhotoDocument {
  id: string;
  label: string;
  category: "photo" | "document" | "floor_plan";
  fileUrl?: string;
  fileName?: string;
}

export interface AdministrationData {
  operationalPolicies: PolicyDocument[];
  coordinatorContacts: CoordinatorContact[];
  emergencyContacts: EmergencyContact[];
  maps: MapAsset[];
  photosDocuments: PhotoDocument[];
  websiteResourceLinks: string[];
}

// ─── Default props ────────────────────────────────────────────────────────────

interface AdministrationPanelProps {
  data?: AdministrationData;
  onSave?: (data: AdministrationData) => Promise<void>;
  readOnly?: boolean;
}

const DEFAULT_DATA: AdministrationData = {
  operationalPolicies: [],
  coordinatorContacts: [],
  emergencyContacts: [],
  maps: [],
  photosDocuments: [],
  websiteResourceLinks: [
    "https://www.osha.gov/etools/evacuation-plans-procedures/eap/develop-implement/checklists",
    "https://www.osha.gov/etools/evacuation-plans-procedures/eap/develop-implement",
  ],
};

let contactIdCounter = 0;
let policyIdCounter = 0;
let mapIdCounter = 0;
let photoIdCounter = 0;

// ─── Component ────────────────────────────────────────────────────────────────

export function AdministrationPanel({
  data: initialData,
  onSave,
  readOnly = false,
}: AdministrationPanelProps) {
  const [data, setData] = useState<AdministrationData>(initialData ?? DEFAULT_DATA);
  const [saving, setSaving] = useState(false);

  const addContact = () => {
    contactIdCounter++;
    const newContact: CoordinatorContact = {
      id: `coord_${contactIdCounter}`,
      role: "",
      name: "",
      phone: "",
      email: "",
    };
    setData((prev) => ({
      ...prev,
      coordinatorContacts: [...prev.coordinatorContacts, newContact],
    }));
  };

  const updateContact = (id: string, field: keyof CoordinatorContact, value: string) => {
    setData((prev) => ({
      ...prev,
      coordinatorContacts: prev.coordinatorContacts.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  const removeContact = (id: string) => {
    setData((prev) => ({
      ...prev,
      coordinatorContacts: prev.coordinatorContacts.filter((c) => c.id !== id),
    }));
  };

  const addEmergencyContact = () => {
    contactIdCounter++;
    const newContact: EmergencyContact = {
      id: `emerg_${contactIdCounter}`,
      name: "",
      title: "",
      phone: "",
      email: "",
      type: "other",
    };
    setData((prev) => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, newContact],
    }));
  };

  const updateEmergencyContact = (id: string, field: keyof EmergencyContact, value: string) => {
    setData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  const removeEmergencyContact = (id: string) => {
    setData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((c) => c.id !== id),
    }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(data);
      toast.success("Administration settings saved.");
    } catch {
      toast.error("Failed to save administration settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            <CardTitle className="text-base">Administration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Manage facility administration data including operational policies,
            coordinator assignments, emergency contacts, floor plan mappings,
            photos, documents, and regulatory website resource links.
          </p>
        </CardContent>
      </Card>

      {/* 1. Operational Policies */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-primary" />
              <CardTitle className="text-sm">Operational Policies</CardTitle>
            </div>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => {
                policyIdCounter++;
                setData((prev) => ({
                  ...prev,
                  operationalPolicies: [
                    ...prev.operationalPolicies,
                    { id: `policy_${policyIdCounter}`, name: "", description: "" },
                  ],
                }));
              }}>
                <Plus size={13} className="mr-1" /> Add Policy
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.operationalPolicies.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No operational policies documented yet.
            </p>
          )}
          {data.operationalPolicies.map((policy) => (
            <div key={policy.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Policy name (e.g. Workplace Violence Prevention Policy)"
                  value={policy.name}
                  onChange={(e) => {
                    setData((prev) => ({
                      ...prev,
                      operationalPolicies: prev.operationalPolicies.map((p) =>
                        p.id === policy.id ? { ...p, name: e.target.value } : p
                      ),
                    }));
                  }}
                  className="text-sm"
                  disabled={readOnly}
                />
                <Textarea
                  placeholder="Brief description of the policy..."
                  value={policy.description}
                  onChange={(e) => {
                    setData((prev) => ({
                      ...prev,
                      operationalPolicies: prev.operationalPolicies.map((p) =>
                        p.id === policy.id ? { ...p, description: e.target.value } : p
                      ),
                    }));
                  }}
                  className="text-sm min-h-[60px]"
                  rows={2}
                  disabled={readOnly}
                />
                {policy.fileName && (
                  <p className="text-xs text-muted-foreground">
                    <ExternalLink size={10} className="inline mr-1" />
                    {policy.fileName}
                  </p>
                )}
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setData((prev) => ({
                      ...prev,
                      operationalPolicies: prev.operationalPolicies.filter(
                        (p) => p.id !== policy.id
                      ),
                    }));
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 2. Coordinator Contacts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-primary" />
              <CardTitle className="text-sm">Coordinator Contacts</CardTitle>
            </div>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={addContact}>
                <Plus size={13} className="mr-1" /> Add Contact
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.coordinatorContacts.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No coordinator contacts added yet.
            </p>
          )}
          {data.coordinatorContacts.map((contact) => (
            <div key={contact.id} className="grid grid-cols-4 gap-2 p-3 rounded-lg bg-muted/40 border border-border">
              <Input
                placeholder="Role (e.g. EAP Lead)"
                value={contact.role}
                onChange={(e) => updateContact(contact.id, "role", e.target.value)}
                className="text-sm"
                disabled={readOnly}
              />
              <Input
                placeholder="Full Name"
                value={contact.name}
                onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                className="text-sm"
                disabled={readOnly}
              />
              <Input
                placeholder="Phone"
                value={contact.phone}
                onChange={(e) => updateContact(contact.id, "phone", e.target.value)}
                className="text-sm"
                disabled={readOnly}
              />
              <div className="flex items-center gap-1">
                <Input
                  placeholder="Email"
                  value={contact.email}
                  onChange={(e) => updateContact(contact.id, "email", e.target.value)}
                  className="text-sm"
                  disabled={readOnly}
                />
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeContact(contact.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Emergency Contacts (Migrated from Facility Profile) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone size={15} className="text-primary" />
              <CardTitle className="text-sm">Emergency Contacts</CardTitle>
            </div>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={addEmergencyContact}>
                <Plus size={13} className="mr-1" /> Add Contact
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground mb-2">
            These contacts have been migrated from the Facility Profile. They are
            now managed exclusively in this Administration section.
          </p>
          {data.emergencyContacts.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No emergency contacts added yet.
            </p>
          )}
          {data.emergencyContacts.map((contact) => (
            <div key={contact.id} className="grid grid-cols-5 gap-2 p-3 rounded-lg bg-muted/40 border border-border">
              <Input
                placeholder="Name"
                value={contact.name}
                onChange={(e) => updateEmergencyContact(contact.id, "name", e.target.value)}
                className="text-sm"
                disabled={readOnly}
              />
              <Input
                placeholder="Title/Role"
                value={contact.title}
                onChange={(e) => updateEmergencyContact(contact.id, "title", e.target.value)}
                className="text-sm"
                disabled={readOnly}
              />
              <Input
                placeholder="Phone"
                value={contact.phone}
                onChange={(e) => updateEmergencyContact(contact.id, "phone", e.target.value)}
                className="text-sm"
                disabled={readOnly}
              />
              <Input
                placeholder="Email"
                value={contact.email}
                onChange={(e) => updateEmergencyContact(contact.id, "email", e.target.value)}
                className="text-sm"
                disabled={readOnly}
              />
              <div className="flex items-center gap-1">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                  value={contact.type}
                  onChange={(e) => updateEmergencyContact(contact.id, "type", e.target.value)}
                  disabled={readOnly}
                >
                  <option value="primary">Primary</option>
                  <option value="backup">Backup</option>
                  <option value="after_hours">After Hours</option>
                  <option value="other">Other</option>
                </select>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEmergencyContact(contact.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 4. Add Mapping (Floor Plans) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Map size={15} className="text-primary" />
            <CardTitle className="text-sm">Site Mapping / Floor Plans</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Upload or coordinate building/facility site layouts and floor plans.
          </p>
          {data.maps.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Map size={24} className="mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No floor plans uploaded yet.</p>
              {!readOnly && (
                <Button variant="outline" size="sm" className="mt-2">
                  <Upload size={13} className="mr-1" /> Upload Floor Plan
                </Button>
              )}
            </div>
          )}
          {data.maps.map((mapAsset) => (
            <div key={mapAsset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center gap-2">
                <Map size={14} className="text-muted-foreground" />
                <span className="text-sm">{mapAsset.label}</span>
              </div>
              {!readOnly && (
                <Button variant="ghost" size="sm" className="text-red-500">
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 5. Photos and Documents */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Image size={15} className="text-primary" />
            <CardTitle className="text-sm">Photos & Documents</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Upload site audit photos and supporting documents.
          </p>
          {data.photosDocuments.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Image size={24} className="mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No photos or documents uploaded yet.</p>
              {!readOnly && (
                <Button variant="outline" size="sm" className="mt-2">
                  <Upload size={13} className="mr-1" /> Upload Files
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. Website Resource Links */}
      <WebsiteResourceLinks
        links={data.websiteResourceLinks}
        onChange={(links: string[]) => setData((prev) => ({ ...prev, websiteResourceLinks: links }))}
        readOnly={readOnly}
      />

      {/* Save Button */}
      {!readOnly && onSave && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Save Administration Settings"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default AdministrationPanel;