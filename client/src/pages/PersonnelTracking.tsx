import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Crosshair, MapPin, Users } from "lucide-react";
import { useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type PersonnelMember = {
  id: number;
  orgId: number;
  userId: number;
  role: string | null;
  invitedAt: string | Date | null;
  joinedAt: string | Date | null;
  userName: string | null;
  userEmail: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationStatus: string | null;
  locationUpdatedAt: string | Date | null;
};

export default function PersonnelTracking() {
  const [, navigate] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationTimestamp, setLocationTimestamp] = useState<Date | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const currentUserMarkerRef = useRef<google.maps.Marker | null>(null);

  const { data: memberships = [] } = trpc.org.myMemberships.useQuery();
  const orgId = memberships[0]?.orgId ?? 0;
  const { data: personnel = [] as PersonnelMember[], isLoading: loadingPersonnel } = trpc.org.personnel.list.useQuery(
    { orgId },
    { enabled: orgId > 0, refetchInterval: 15000 },
  );

  const updateLocation = trpc.org.personnel.updateLocation.useMutation();

  const selectedMember = personnel.find((member) => member.userId === selectedUserId) ?? null;

  const initialCenter = useMemo<google.maps.LatLngLiteral>(() => {
    if (selectedMember?.locationLatitude != null && selectedMember?.locationLongitude != null) {
      return { lat: selectedMember.locationLatitude, lng: selectedMember.locationLongitude };
    }
    return currentPosition ?? { lat: 37.7749, lng: -122.4194 };
  }, [currentPosition, selectedMember]);

    const recenterMap = useCallback(() => {
    if (mapRef.current && currentPosition) {
      mapRef.current.setZoom(16);
      mapRef.current.panTo(currentPosition);
    }
  }, [currentPosition]);

  const onMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (currentPosition) {
      map.setCenter(currentPosition);
      map.setZoom(16);
    }
  }, [currentPosition]);

    // Start geolocation immediately (independent of orgId) so the browser prompts for permission
    useEffect(() => {
      if (!navigator.geolocation) {
        setGeoError("Geolocation is not supported by your browser.");
        return;
      }

      // First, get a single position to trigger the browser permission prompt immediately
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng, accuracy: posAccuracy } = position.coords;
          setCurrentPosition({ lat, lng });
          setAccuracy(posAccuracy);
          setLocationTimestamp(new Date());
          setGeoError(null);
          // Send to server if orgId is available
          if (orgId) {
            updateLocation.mutate({ orgId, latitude: lat, longitude: lng, status: "Active" });
          }
        },
        (error) => {
          setGeoError(error.message || "Unable to determine your location.");
        },
        { enableHighAccuracy: true, timeout: 15000 },
      );

      // Then continuously watch for position updates
      const watcherId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude: lat, longitude: lng, accuracy: posAccuracy } = position.coords;
          setCurrentPosition({ lat, lng });
          setAccuracy(posAccuracy);
          setLocationTimestamp(new Date());
          setGeoError(null);
          if (orgId) {
            updateLocation.mutate({ orgId, latitude: lat, longitude: lng, status: "Active" });
          }
        },
        (error) => {
          setGeoError(error.message || "Unable to determine your location.");
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );

      return () => {
        navigator.geolocation.clearWatch(watcherId);
      };
    }, []); // Only run once on mount

    // Also send location to server when orgId becomes available (e.g. after login redirect)
    useEffect(() => {
      if (!orgId || !currentPosition) return;
      updateLocation.mutate({
        orgId,
        latitude: currentPosition.lat,
        longitude: currentPosition.lng,
        status: "Active",
      });
    }, [orgId]);

  // Update the accuracy circle and current-user marker on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentPosition || !window.google) return;

    // Remove old accuracy circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
    }

    // Draw accuracy radius circle
    if (accuracy != null) {
      accuracyCircleRef.current = new window.google.maps.Circle({
        map,
        center: currentPosition,
        radius: accuracy,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.3,
        strokeWeight: 1,
      });
    }
  }, [currentPosition, accuracy]);

    useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !personnel) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    currentUserMarkerRef.current = null;

    personnel.forEach((member) => {
      if (member.locationLatitude == null || member.locationLongitude == null) return;
      const isCurrentUser = member.userId === memberships[0]?.userId;

      // Skip the current user — they're shown via the My Location blue dot + accuracy circle
      if (isCurrentUser) return;

      const marker = new window.google.maps.Marker({
        map,
        position: { lat: member.locationLatitude, lng: member.locationLongitude },
        title: member.userName || member.userEmail || "Unknown person",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#f97316",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#111827",
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family: Inter, system-ui, sans-serif; font-size: 13px; line-height: 1.4; color: #f8fafc;">
            <strong style="display:block; margin-bottom: 4px;">${member.userName ?? member.userEmail ?? "Unknown"}</strong>
            <div style="margin-bottom: 2px;">${member.role ?? "Staff"}</div>
            <div style="font-size: 12px; opacity: 0.8;">${member.locationStatus ?? "Active"}</div>
            ${member.locationUpdatedAt ? `<div style="font-size: 11px; opacity: 0.75; margin-top:4px;">Updated ${new Date(member.locationUpdatedAt).toLocaleString()}</div>` : ""}
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open({ anchor: marker, map });
      });
      markersRef.current.push(marker);
    });
  }, [memberships, personnel]);

  useEffect(() => {
    if (!selectedMember || !mapRef.current) return;
    if (selectedMember.locationLatitude && selectedMember.locationLongitude) {
      mapRef.current.panTo({ lat: selectedMember.locationLatitude, lng: selectedMember.locationLongitude });
      mapRef.current.setZoom(14);
    }
  }, [selectedMember]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-2 text-sm uppercase tracking-[0.24em] text-slate-300">
              <MapPin className="h-4 w-4" />
              Personnel Tracking
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Live personnel location overview</h1>
            <p className="max-w-2xl mt-2 text-sm text-slate-400">
              Track your own device location and view the latest reported positions for people on your team. Use the menu to select personnel and center the map on their reported location.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate("/dashboard")}> 
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Button>
        </div>

        {geoError ? (
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <strong className="font-semibold">Location access needed.</strong> {geoError}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
          <section className="rounded-3xl border border-border/70 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/20">
            <div className="flex items-center justify-between gap-4 pb-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Secure map view</p>
              <p className="mt-1 text-xs text-slate-500">Google Maps markers show the most recent authorized position for tracked personnel.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={recenterMap}
                disabled={!currentPosition}
                className="flex items-center gap-1.5 text-xs"
              >
                <Crosshair className="h-3.5 w-3.5" />
                Recenter
              </Button>
              <div className="flex flex-col gap-2 text-right">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Org</span>
                <span className="text-sm font-semibold text-white">{memberships[0]?.orgName ?? "Unknown org"}</span>
              </div>
            </div>
            </div>
            <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-950">
              <MapView initialCenter={initialCenter} initialZoom={12} onMapReady={onMapReady} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                <p className="text-sm text-slate-500 uppercase tracking-[0.18em]">Tracked people</p>
                <p className="mt-2 text-2xl font-semibold text-white">{personnel?.length ?? 0}</p>
              </div>
                            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                <p className="text-sm text-slate-500 uppercase tracking-[0.18em]">Your device</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {currentPosition ? "Active" : "Waiting..."}
                </p>
                {currentPosition && accuracy != null && (
                  <p className="mt-1 text-xs text-slate-500">
                    Accuracy: {accuracy < 1 ? "<1m" : accuracy < 10 ? accuracy.toFixed(1) + "m" : Math.round(accuracy) + "m"}
                    {locationTimestamp && ` · ${locationTimestamp.toLocaleTimeString()}`}
                  </p>
                )}
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                <p className="text-sm text-slate-500 uppercase tracking-[0.18em]">Refresh cadence</p>
                <p className="mt-2 text-2xl font-semibold text-white">15s</p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Team roster</p>
                  <p className="mt-1 text-xs text-slate-500">Select a person to center the map on their latest reported position.</p>
                </div>
                <Badge variant="secondary">{personnel?.length ?? 0} members</Badge>
              </div>
              <Separator className="my-4" />

              {loadingPersonnel ? (
                <div className="space-y-3 py-8 text-sm text-slate-500">Loading personnel data...</div>
              ) : !personnel?.length ? (
                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/80 p-6 text-sm text-slate-400">
                  No personnel locations are available yet. Make sure teammates have granted location access and are active in the system.
                </div>
              ) : (
                <div className="space-y-3">
                  {personnel.map((member) => {
                    const isSelected = member.userId === selectedUserId;
                    const hasLocation = member.locationLatitude != null && member.locationLongitude != null;
                    return (
                      <button
                        key={member.userId}
                        type="button"
                        onClick={() => setSelectedUserId(member.userId)}
                        className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                          isSelected ? "border-sky-400 bg-slate-900/95" : "border-slate-800 bg-slate-950/80 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{member.userName ?? member.userEmail ?? "Unknown"}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{member.role ?? "Staff"}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${hasLocation ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-700 text-slate-300"}`}>
                            {hasLocation ? "Live" : "No GPS"}
                          </span>
                        </div>
                        <div className="mt-3 text-xs leading-5 text-slate-400">
                          {hasLocation ? (
                            <>
                              {member.locationLatitude?.toFixed(4)}, {member.locationLongitude?.toFixed(4)}
                              <div className="mt-1 text-[11px] text-slate-500">
                                {member.locationStatus ?? "Active"} • {member.locationUpdatedAt ? new Date(member.locationUpdatedAt).toLocaleTimeString() : "Unknown"}
                              </div>
                            </>
                          ) : (
                            "Location data not yet available for this teammate."
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-border/70 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/20">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Users className="h-4 w-4 text-slate-300" />
                <span>Data is delivered securely and refreshed regularly for active team members.</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-500">
                <p><span className="font-semibold text-slate-200">Current organization:</span> {memberships[0]?.orgName ?? "None"}</p>
                <p><span className="font-semibold text-slate-200">Permission:</span> {memberships[0]?.role ?? "Member"}</p>
                <p><span className="font-semibold text-slate-200">Backend sync:</span> {updateLocation.status === "pending" ? "Sending latest position..." : "Up to date"}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
