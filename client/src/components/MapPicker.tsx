/**
 * MapPicker — Interactive Google Map with draggable marker and address search.
 * Used for pinning facility locations on a map.
 */
/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import { MapView } from "./Map";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, Search, Crosshair } from "lucide-react";
import { toast } from "sonner";

export interface MapPickerResult {
  lat: number | null;
  lng: number | null;
  address: string;
}

interface MapPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string;
  onChange: (result: MapPickerResult) => void;
}

let geocoderInstance: google.maps.Geocoder | null = null;
function getGeocoder() {
  if (!geocoderInstance && window.google?.maps) {
    geocoderInstance = new google.maps.Geocoder();
  }
  return geocoderInstance;
}

export default function MapPicker({ initialLat, initialLng, initialAddress = "", onChange }: MapPickerProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [resolvedAddress, setResolvedAddress] = useState(initialAddress);

  // Place or update marker
  const placeMarker = useCallback((map: google.maps.Map, position: google.maps.LatLngLiteral) => {
    if (markerRef.current) {
      markerRef.current.position = position;
      markerRef.current.map = map;
    } else if (window.google?.maps?.marker?.AdvancedMarkerElement) {
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        title: "Facility Location",
        gmpDraggable: true,
      });
      markerRef.current.addListener("dragend", (e: any) => {
        const pos = e.latLng;
        if (pos) {
          handleNewPosition({ lat: pos.lat(), lng: pos.lng() }, map);
        }
      });
    }
  }, []);

  const handleNewPosition = useCallback(async (position: { lat: number; lng: number }, map?: google.maps.Map) => {
    const m = map ?? mapRef.current;
    if (!m) return;
    setCoords(position);
    if (markerRef.current) {
      markerRef.current.position = position;
    } else {
      placeMarker(m, position);
    }
    m.setCenter(position);
    // Reverse geocode to get address
    const geocoder = getGeocoder();
    if (geocoder) {
      geocoder.geocode({ location: position }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const addr = results[0].formatted_address;
          setResolvedAddress(addr);
          setSearchQuery(addr);
          onChange({ lat: position.lat, lng: position.lng, address: addr });
        } else {
          onChange({ lat: position.lat, lng: position.lng, address: resolvedAddress });
        }
      });
    } else {
      onChange({ lat: position.lat, lng: position.lng, address: resolvedAddress });
    }
  }, [onChange, resolvedAddress, placeMarker]);

  // Search for an address
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !mapRef.current) return;
    const geocoder = getGeocoder();
    if (!geocoder) {
      toast.error("Google Maps Geocoder not loaded yet. Try again.");
      return;
    }
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        const pos = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        };
        handleNewPosition(pos, mapRef.current!);
        setSearchQuery(results[0].formatted_address);
        toast.success("Location found");
      } else {
        toast.error("Could not find that address");
      }
    });
  }, [searchQuery, handleNewPosition]);

  // Use browser geolocation
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleNewPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }, mapRef.current!);
        toast.success("Location found");
      },
      () => toast.error("Could not get your location. Check browser permissions.")
    );
  }, [handleNewPosition]);

  // Init map with initial coords or default
  const onMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (coords) {
      map.setCenter(coords);
      map.setZoom(16);
      placeMarker(map, coords);
    } else {
      // Default to a broad US view
      map.setZoom(4);
      map.setCenter({ lat: 39.8283, lng: -98.5795 });
    }
  }, [coords, placeMarker]);

  // If coords change externally, update
  useEffect(() => {
    if (initialLat && initialLng && (!coords || coords.lat !== initialLat || coords.lng !== initialLng)) {
      setCoords({ lat: initialLat, lng: initialLng });
      if (mapRef.current) {
        handleNewPosition({ lat: initialLat, lng: initialLng }, mapRef.current);
      }
    }
  }, [initialLat, initialLng]);

  return (
    <div className="space-y-3">
      <Label>Facility Location on Map</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search address or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="icon" onClick={handleSearch} title="Search">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleUseMyLocation} title="Use my location">
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>
      <MapView
        className="rounded-lg border border-border"
        initialCenter={coords ?? { lat: 39.8283, lng: -98.5795 }}
        initialZoom={coords ? 16 : 4}
        onMapReady={onMapReady}
      />
      {coords && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>
            {resolvedAddress || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`}
          </span>
        </div>
      )}
    </div>
  );
}