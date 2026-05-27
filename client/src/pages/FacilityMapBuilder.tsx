/**
 * FacilityMapBuilder — Upload or create floor maps for facilities.
 *
 * Two modes:
 *   1. Upload Floor Plan — upload PNG, JPEG, or PDF to S3
 *   2. Create from Scratch — draw rooms and add markers
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Upload, Plus, Trash2, MapPin, Download, Loader2,
  Layers, Image as ImageIcon, Pen, CheckCircle2, Building2,
} from "lucide-react";

export default function FacilityMapBuilder() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("upload");

  // Upload state
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [mapName, setMapName] = useState("");
  const [floor, setFloor] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Queries
  const facilitiesQuery = trpc.facility.list.useQuery();
  const mapsQuery = trpc.facilityMap.list.useQuery(
    { facilityId: parseInt(selectedFacilityId) },
    { enabled: !!selectedFacilityId }
  );
  const uploadMutation = trpc.facilityMap.upload.useMutation({
    onSuccess: (data) => {
      toast.success("Floor plan uploaded!");
      setUploadedUrl(data.url);
      mapsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFacilityId || !mapName) {
      toast.error("Select a facility and enter a map name first");
      return;
    }

    const validTypes = ["image/png", "image/jpeg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only PNG, JPEG, and PDF files are supported");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        const img = new Image();
        img.onload = () => {
          uploadMutation.mutate({
            facilityId: parseInt(selectedFacilityId),
            name: mapName,
            floor: floor || undefined,
            base64Data: base64,
            mimeType: file.type,
            width: img.width,
            height: img.height,
          });
        };
        img.onerror = () => {
          // PDF won't load as image, but still upload
          uploadMutation.mutate({
            facilityId: parseInt(selectedFacilityId),
            name: mapName,
            floor: floor || undefined,
            base64Data: base64,
            mimeType: file.type,
          });
        };
        if (file.type.startsWith("image/")) {
          img.src = reader.result as string;
        } else {
          // PDF - skip dimensions
          uploadMutation.mutate({
            facilityId: parseInt(selectedFacilityId),
            name: mapName,
            floor: floor || undefined,
            base64Data: base64,
            mimeType: file.type,
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-5xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Facility Mapping</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload floor plans or create new maps for your facilities.
            </p>
          </div>
        </div>

        {/* Facility Selector */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Select Facility</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a facility..." />
              </SelectTrigger>
              <SelectContent>
                {facilitiesQuery.data?.map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      {f.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedFacilityId && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" /> Upload Floor Plan
              </TabsTrigger>
              <TabsTrigger value="existing">
                <Layers className="h-4 w-4 mr-2" /> Existing Maps
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upload a Floor Plan</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Supports PNG, JPEG, and PDF files. The image will be stored securely and available for annotation.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div>
                      <Label>Map Name</Label>
                      <Input
                        placeholder="e.g. First Floor - Main Office"
                        value={mapName}
                        onChange={e => setMapName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Floor (optional)</Label>
                      <Input
                        placeholder="e.g. Floor 1, Basement"
                        value={floor}
                        onChange={e => setFloor(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Upload File</Label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => document.getElementById("file-upload")?.click()}
                      >
                        <div className="text-center">
                          <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPEG, or PDF up to 50MB
                          </p>
                        </div>
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading || uploadMutation.isPending}
                      />
                    </div>
                  </div>

                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                    </div>
                  )}

                  {uploadedUrl && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-2">
                        <CheckCircle2 className="h-4 w-4" /> Upload successful
                      </div>
                      <img src={uploadedUrl} alt="Floor plan" className="max-h-64 rounded border" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Existing Maps Tab */}
            <TabsContent value="existing" className="space-y-4">
              {mapsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : mapsQuery.data?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No floor maps yet</p>
                  <p className="text-sm mt-1">Upload a floor plan to get started.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {mapsQuery.data?.map(map => (
                    <Card key={map.id}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{map.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {map.floor ? `${map.floor} · ` : ""}
                              Uploaded {new Date(map.createdAt).toLocaleDateString()}
                              {map.width && map.height ? ` · ${map.width}×${map.height}px` : ""}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {map.imageUrl && (
                              <Button variant="outline" size="sm" onClick={() => window.open(map.imageUrl!, "_blank")}>
                                <ImageIcon className="h-3.5 w-3.5 mr-1" /> View
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}

