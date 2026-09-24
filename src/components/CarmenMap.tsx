import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CarmenIncidentReport, CarmenBarangay } from '../types';
import { CARMEN_CENTER, CARMEN_BARANGAYS } from '../data/carmenData';
import { MapPin, Navigation } from 'lucide-react';

interface CarmenMapProps {
  incidents: CarmenIncidentReport[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: CarmenIncidentReport) => void;
  onPickCoordinates?: (lat: number, lng: number) => void;
  isPickingLocation?: boolean;
  pickedCoords?: { latitude: number; longitude: number } | null;
  heightClass?: string;
  showAllHistory?: boolean;
}

export const CarmenMap: React.FC<CarmenMapProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onPickCoordinates,
  isPickingLocation = false,
  pickedCoords,
  heightClass = 'h-[440px] sm:h-[520px]',
  showAllHistory = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [CARMEN_CENTER.latitude, CARMEN_CENTER.longitude],
      zoom: CARMEN_CENTER.zoom,
      zoomControl: false,
    });

    // High clarity CartoDB Voyager tiles (crisp and clean)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Map Click Listener for Location Picking
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (onPickCoordinates) {
        onPickCoordinates(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [onPickCoordinates]);

  // Update Layers (Incident markers, Carmen Barangay markers, Picked markers)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Carmen Barangays Reference Markers
    CARMEN_BARANGAYS.forEach((brgy) => {
      const isMdrrmoCenter = brgy.name === 'Poblacion';

      const brgyIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center">
            <div class="w-6 h-6 rounded-full ${
              isMdrrmoCenter ? 'bg-emerald-700 ring-4 ring-emerald-300' : 'bg-emerald-600'
            } text-white flex items-center justify-center shadow text-[10px] font-bold">
              ${isMdrrmoCenter ? '🏢' : '📍'}
            </div>
            <span class="mt-0.5 bg-white/95 text-emerald-950 font-bold text-[9px] px-1.5 py-0.5 rounded shadow border border-emerald-200 whitespace-nowrap">
              ${brgy.name}
            </span>
          </div>
        `,
        className: 'carmen-brgy-marker',
        iconSize: [24, 38],
        iconAnchor: [12, 19],
      });

      const marker = L.marker([brgy.latitude, brgy.longitude], { icon: brgyIcon });
      marker.bindTooltip(
        `<div class="p-1 text-xs">
          <div class="font-bold text-emerald-900">Brgy. ${brgy.name}</div>
          <div class="text-[11px] text-slate-600">${brgy.description || 'Municipality of Carmen'}</div>
        </div>`,
        { direction: 'top' }
      );
      marker.addTo(layerGroup);
    });

    // 2. Incident Markers
    const displayIncidents = showAllHistory
      ? incidents
      : incidents.filter((i) => i.status !== 'Resolved');

    displayIncidents.forEach((inc) => {
      const isSelected = inc.id === selectedIncidentId;
      const isPending = inc.status === 'Pending';
      const isDispatched = inc.status === 'Responders Dispatched';

      // Category Icon
      let emoji = '⚠️';
      let bgColor = 'bg-emerald-700';

      if (inc.category === 'Structural Fire') {
        emoji = '🏠🔥';
        bgColor = 'bg-red-600 ring-4 ring-red-300 animate-pulse';
      } else if (inc.category === 'Grass Fire') {
        emoji = '🌾🔥';
        bgColor = 'bg-amber-600 ring-4 ring-amber-300';
      } else if (inc.category === 'Vehicular Accident') {
        emoji = '🚗💥';
        bgColor = 'bg-blue-600 ring-4 ring-blue-300';
      } else if (inc.category === 'Medical Assistance') {
        emoji = '🚑';
        bgColor = 'bg-rose-600 ring-4 ring-rose-300';
      }

      const html = `
        <div class="relative flex flex-col items-center cursor-pointer group">
          <div class="w-10 h-10 rounded-full ${bgColor} text-white shadow-xl border-2 border-white flex items-center justify-center font-bold text-sm ${
        isSelected ? 'scale-125 ring-4 ring-emerald-500' : ''
      }">
            <span>${emoji}</span>
          </div>
          <span class="mt-1 bg-slate-900 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
            ${inc.incidentNumber}
          </span>
          ${
            isPending
              ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping"></span>'
              : ''
          }
        </div>
      `;

      const incidentIcon = L.divIcon({
        html,
        className: 'carmen-incident-marker',
        iconSize: [40, 48],
        iconAnchor: [20, 24],
      });

      const marker = L.marker([inc.gpsCoordinates.latitude, inc.gpsCoordinates.longitude], {
        icon: incidentIcon,
      });

      marker.on('click', () => {
        if (onSelectIncident) {
          onSelectIncident(inc);
        }
      });

      marker.bindTooltip(
        `<div class="p-1.5 text-xs">
          <div class="font-bold text-slate-900">${inc.category}</div>
          <div class="text-[11px] text-emerald-800 font-medium">Brgy. ${inc.incidentLocation.barangay}</div>
          <div class="text-[10px] text-slate-500 font-mono mt-0.5">Status: ${inc.status}</div>
          <div class="text-[10px] text-slate-500 font-mono">Reporter: ${inc.clientFullName} (${inc.clientPhoneNumber})</div>
        </div>`,
        { direction: 'top', offset: [0, -20] }
      );

      marker.addTo(layerGroup);
    });

    // 3. User Picked Coordinates (when reporting)
    if (isPickingLocation && pickedCoords) {
      const pickIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center animate-bounce">
            <div class="w-8 h-8 rounded-full bg-emerald-700 text-white border-2 border-white shadow-xl flex items-center justify-center text-xs font-bold ring-4 ring-emerald-300">
              📍
            </div>
            <span class="bg-emerald-950 text-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded shadow mt-1">
              SELECTED LOCATION
            </span>
          </div>
        `,
        className: 'picked-coords-marker',
        iconSize: [32, 48],
        iconAnchor: [16, 40],
      });

      L.marker([pickedCoords.latitude, pickedCoords.longitude], { icon: pickIcon }).addTo(
        layerGroup
      );
    }
  }, [
    incidents,
    selectedIncidentId,
    showAllHistory,
    isPickingLocation,
    pickedCoords,
    onSelectIncident,
  ]);

  // Center on selected incident
  useEffect(() => {
    if (!selectedIncidentId || !mapInstanceRef.current) return;
    const target = incidents.find((i) => i.id === selectedIncidentId);
    if (target) {
      mapInstanceRef.current.panTo(
        [target.gpsCoordinates.latitude, target.gpsCoordinates.longitude],
        { animate: true, duration: 0.8 }
      );
    }
  }, [selectedIncidentId, incidents]);

  return (
    <div
      className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-emerald-200 shadow-md bg-white`}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-[400] bg-emerald-900/90 backdrop-blur-xs text-white px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2.5 border border-emerald-700/60 shadow-md">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
        <span className="font-bold text-white">Carmen, Surigao del Sur</span>
        <span className="text-emerald-300">·</span>
        <span className="text-emerald-200 font-mono text-[11px]">
          {incidents.filter((i) => i.status !== 'Resolved').length} Active Reports
        </span>
      </div>

      {/* Location Picking Banner */}
      {isPickingLocation && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[400] bg-emerald-700 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-emerald-500 animate-pulse flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5" />
          <span>Tap anywhere on the Carmen map to pinpoint your exact incident location</span>
        </div>
      )}

      {/* Category Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-emerald-100 text-[11px] text-slate-700 shadow-md hidden sm:flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
          <span>Structural Fire</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
          <span>Grass Fire</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <span>Vehicular Accident</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
          <span>Medical Assistance</span>
        </div>
      </div>
    </div>
  );
};
