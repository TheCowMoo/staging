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
    const map = mapRef.current;
    if (!map) return;
    
    if (currentPosition) {
      map.setZoom(16);
      map.panTo(currentPosition);
    }
  }, [currentPosition]);

  const onMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

    // Geolocation state: track if we've tried
    const watchRef = useRef<number | null>(null);
    const [geoAttempted, setGeoAttempted] = useState(false);

    const sendLocationToServer = useCallback((lat: number, lng: number) => {
      if (!orgId) return;
      updateLocation.mutate({ orgId, latitude: lat, longitude: lng, status: "Active" });
    }, [orgId, updateLocation]);

    const onPositionSuccess = useCallback((position: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy: posAccuracy } = position.coords;
      setCurrentPosition({ lat, lng });
      setAccuracy(posAccuracy);
      setLocationTimestamp(new Date());
      setGeoError(null);
      setGeoAttempted(true);
      sendLocationToServer(lat, lng);
    }, [sendLocationToServer]);

    const onPositionError = useCallback((error: GeolocationPositionError) => {
      const msgs: Record<number, string> = {
        1: "Location permission was denied. Please allow location access in your browser settings and refresh the page.",
        2: "Position unavailable. GPS signal may be weak — try moving to an open area.",
        3: "Location request timed out. Click 'Update My Location' to try again.",
      };
      setGeoError(msgs[error.code] || error.message || "Unable to determine your location.");
      setGeoAttempted(true);
    }, []);

    // Start watching location — re-run if orgId changes
    useEffect(() => {
      if (!navigator.geolocation) {
        setGeoError("Geolocation is not supported by your browser.");
        return;
      }

      // getCurrentPosition first to trigger permission prompt fast
      navigator.geolocation.getCurrentPosition(
        onPositionSuccess,
        onPositionError,
        { enableHighAccuracy: true, timeout: 10000 },
      );

      // watchPosition for continuous tracking
      const watcherId = navigator.geolocation.watchPosition(
        onPositionSuccess,
        onPositionError,
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
      watchRef.current = watcherId;

      return () => {
        navigator.geolocation.clearWatch(watcherId);
      };
    }, [onPositionSuccess, onPositionError]); // Re-run if user manually requests location

    // Retry when orgId becomes available and we haven't found location yet
    useEffect(() => {
      if (!orgId || currentPosition) return;
      // Try again if we have an error and org just loaded
      if (geoError && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          onPositionSuccess,
          onPositionError,
          { enableHighAccuracy: true, timeout: 10000 },
        );
      }
    }, [orgId]);

    const handleRetryGeolocation = useCallback(() => {
      if (!navigator.geolocation) return;
      setGeoError(null);
      navigator.geolocation.getCurrentPosition(
        onPositionSuccess,
        onPositionError,
        { enableHighAccuracy: true, timeout: 15000 },
      );
    }, [onPositionSuccess, onPositionError]);

  // Update the accuracy circle and current-user marker on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentPosition || !window.google) return;

    // Remove old accuracy circle and current user marker
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
    }
    if (currentUserMarkerRef.current) {
      currentUserMarkerRef.current.setMap(null);
      currentUserMarkerRef.current = null;
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

    // Add a blue dot marker for the current user (My Location blue dot alternative)
    currentUserMarkerRef.current = new window.google.maps.Marker({
      map,
      position: currentPosition,
      title: "You are here",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#3b82f6",
        fillOpacity: 1,
        strokeWeight: 3,
        strokeColor: "#ffffff",
      },
      zIndex: 999,
    });
  }, [currentPosition, accuracy]);

    useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google || !personnel) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

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
          <div style="font-family: Inter, system-ui, sans-serif; font-size: 13px; line-height: 1.4; color: #1E232A;">
            <strong style="display:block; margin-bottom: 4px;">${member.userName ?? member.userEmail ?? "Unknown"}</strong>
            <div style="margin-bottom: 2px; color: #5A6570;">${member.role ?? "Staff"}</div>
            <div style="font-size: 12px; color: #5A6570;">${member.locationStatus ?? "Active"}</div>
            ${member.locationUpdatedAt ? `<div style="font-size: 11px; color: #5A6570; margin-top:4px;">Updated ${new Date(member.locationUpdatedAt).toLocaleString()}</div>` : ""}
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
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-sm uppercase tracking-[0.24em] text-primary">
              <MapPin className="h-4 w-4" />
              Personnel Tracking
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Live personnel location overview</h1>
            <p className="max-w-2xl mt-2 text-sm text-muted-foreground">
              Track your own device location and view the latest reported positions for people on your team. Use the menu to select personnel and center the map on their reported location.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate("/dashboard")}> 
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Button>
        </div>

        {geoError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-3">
            <div>
              <strong className="font-semibold">Location access needed.</strong> {geoError}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryGeolocation}
              className="shrink-0 gap-1.5"
            >
              <Crosshair className="h-3.5 w-3.5" />
              Update My Location
            </Button>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-4 pb-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">Secure map view</p>
              <p className="mt-1 text-xs text-muted-foreground">Google Maps markers show the most recent authorized position for tracked personnel.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Always try to recenter — use browser geolocation if no position yet
                  if (currentPosition && mapRef.current) {
                    mapRef.current.setZoom(16);
                    mapRef.current.panTo(currentPosition);
                  } else {
                    handleRetryGeolocation();
                  }
                }}
                className="flex items-center gap-1.5 text-xs"
              >
                <Crosshair className="h-3.5 w-3.5" />
                {currentPosition ? "Recenter" : "Find Me"}
              </Button>
              <div className="flex flex-col gap-2 text-right">
                                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Org</span>
                <span className="text-sm font-semibold text-foreground">{memberships[0]?.orgName ?? "Unknown org"}</span>
              </div>
            </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-border bg-muted relative" style={{ zIndex: 1 }}>
              <MapView initialCenter={initialCenter} initialZoom={12} onMapReady={onMapReady} />
            </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-[0.18em]">Tracked people</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{personnel?.length ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-[0.18em]">Your device</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {currentPosition ? "Active" : "Waiting..."}
                </p>
                {currentPosition && accuracy != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Accuracy: {accuracy < 1 ? "<1m" : accuracy < 10 ? accuracy.toFixed(1) + "m" : Math.round(accuracy) + "m"}
                    {locationTimestamp && ` · ${locationTimestamp.toLocaleTimeString()}`}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground uppercase tracking-[0.18em]">Refresh cadence</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">15s</p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground">Team roster</p>
                  <p className="mt-1 text-xs text-muted-foreground">Select a person to center the map on their latest reported position.</p>
                </div>
                <Badge variant="secondary">{personnel?.length ?? 0} members</Badge>
              </div>
              <Separator className="my-4" />

                            {loadingPersonnel ? (
                <div className="space-y-3 py-8 text-sm text-muted-foreground">Loading personnel data...</div>
              ) : !personnel?.length ? (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-sm text-muted-foreground">
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
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{member.userName ?? member.userEmail ?? "Unknown"}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{member.role ?? "Staff"}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${hasLocation ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                            {hasLocation ? "Live" : "No GPS"}
                          </span>
                        </div>
                        <div className="mt-3 text-xs leading-5 text-muted-foreground">
                          {hasLocation ? (
                            <>
                              {member.locationLatitude?.toFixed(4)}, {member.locationLongitude?.toFixed(4)}
                              <div className="mt-1 text-[11px] text-muted-foreground/70">
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

                        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Data is delivered securely and refreshed regularly for active team members.</span>
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p><span className="font-semibold text-foreground">Current organization:</span> {memberships[0]?.orgName ?? "None"}</p>
                <p><span className="font-semibold text-foreground">Permission:</span> {memberships[0]?.role ?? "Member"}</p>
                <p><span className="font-semibold text-foreground">Backend sync:</span> {updateLocation.status === "pending" ? "Sending latest position..." : "Up to date"}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
