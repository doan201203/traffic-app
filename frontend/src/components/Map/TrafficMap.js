import React, { useRef, useEffect, memo, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapContainer } from "./mapboxMap.styles";
import 'mapbox-gl/dist/mapbox-gl.css';
import NavigationOverlay from "./NavigationOverlay";

const mapboxToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

mapboxgl.accessToken = mapboxToken;

function MapboxMap({
  coords = { lng: 105.85, lat: 21.03 },
  warnings = [],
  webcamOn = false,
  facingMode = "environment",
}) {
  const mapRef = useRef();
  const mapContainerRef = useRef();
  const geolocateControlRef = useRef();
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Create map instance when component mounts
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map with performance optimizations
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [coords.lng, coords.lat],
      zoom: 17.5,
      pitch: 70,
      bearing: -17.6,
      antialias: true,
      renderWorldCopies: false, // Improve performance when zoomed in
      maxPitch: 85, // Limiting maximum pitch for better performance
      attributionControl: false, // Remove attribution for cleaner UI
    });

    // Add attribution in a less obtrusive position
    mapRef.current.addControl(new mapboxgl.AttributionControl({
      compact: true
    }), 'bottom-left');
    
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { 
        enableHighAccuracy: true,
        maximumAge: 10000 // Accept cached position data up to 10 seconds old
      },
      trackUserLocation: true,
      showUserHeading: true,
      fitBoundsOptions: { 
        maxZoom: 17.5 
      }
    });

    // Store geolocate control for later use
    geolocateControlRef.current = geolocate;
    
    mapRef.current.addControl(geolocate, "top-right");
    
    mapRef.current.on("load", () => {
      geolocate.trigger();
      
      // Add 3D buildings with performance optimizations
      const addBuildingLayer = () => {
        if (!mapRef.current) return;
        
        const layers = mapRef.current.getStyle().layers;
        const labelLayerId = layers.find(
          (layer) => layer.type === 'symbol' && layer.layout['text-field']
        )?.id;
        
        if (!labelLayerId) return;

        // Check if layer already exists
        if (mapRef.current.getLayer('add-3d-buildings')) return;

        mapRef.current.addLayer(
          {
            id: 'add-3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );
      };
      
      try {
        addBuildingLayer();
      } catch (err) {
        console.warn("Error adding 3D buildings layer:", err);
      }
      
      setMapLoaded(true);
    });

    // Handle geolocate events
    geolocate.on('geolocate', (e) => {
      const lng = e.coords.longitude;
      const lat = e.coords.latitude;
  
      // Smoothly move to user location
      mapRef.current.easeTo({
        center: [lng, lat],
        zoom: 17.5,
        pitch: 70,
        bearing: 0,
        duration: 1000
      });
    });

    // Add navigation controls 
    const nav = new mapboxgl.NavigationControl({
      visualizePitch: true 
    });
    mapRef.current.addControl(nav, 'bottom-right');

    // Add scale to map
    const scale = new mapboxgl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    });
    mapRef.current.addControl(scale, 'bottom-left');

    // Add responsive handlers
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map when coords change (for non-geolocate cases)
  useEffect(() => {
    if (!mapRef.current || !coords || !mapLoaded) return;
    
    // Only update center if it's significantly different
    const currentCenter = mapRef.current.getCenter();
    const distance = Math.sqrt(
      Math.pow(currentCenter.lng - coords.lng, 2) + 
      Math.pow(currentCenter.lat - coords.lat, 2)
    );
    
    if (distance > 0.0001) {  // Only move if distance is significant
      mapRef.current.easeTo({ 
        center: [coords.lng, coords.lat],
        duration: 1000
      });
    }
  }, [coords, mapLoaded]);

  return (
    <div style={{ position: "relative", width: "100%", height: "70vh", overflow: "hidden" }}>
      <MapContainer ref={mapContainerRef} />
      <NavigationOverlay 
        coords={coords} 
        warnings={warnings} 
        webcamOn={webcamOn} 
        facingMode={facingMode} 
      />
    </div>
  );
}

// Use memo to prevent unnecessary re-renders
export default memo(MapboxMap);