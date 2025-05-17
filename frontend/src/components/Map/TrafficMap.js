import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { MapContainer } from "./mapboxMap.styles";
import 'mapbox-gl/dist/mapbox-gl.css';
import NavigationOverlay from "./NavigationOverlay";

const mapboxToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

mapboxgl.accessToken = mapboxToken;

export default function MapboxMap({
  coords = { lng: 105.85, lat: 21.03 },
  notification,
  speedImage,
}) {
  const mapRef = useRef();
  const mapContainerRef = useRef();

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      // style: "mapbox://styles/mapbox/streets-v12",
      style: 'mapbox://styles/mapbox/standard',
      center: [coords.lng, coords.lat],
      zoom: 17.5,
      pitch: 70,
      bearing: -17.6,
      antialias: true,
    });
    
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      fitBoundsOptions: { maxZoom: 17.5 }
    });

    mapRef.current.addControl(geolocate, "top-right");
    // keep geolocate always active
    mapRef.current.on("load", () => {
      geolocate.trigger();
      
      const layers = mapRef.current.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
      );

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
    });

    geolocate.on('geolocate', async (e) => {
      const lng = e.coords.longitude;
      const lat = e.coords.latitude;
  
      mapRef.current.easeTo({
        center: [lng, lat],
        zoom: 17.5,
        pitch: 70,
        bearing: 0,
        duration: 1000
      });
      
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []);

  
  // useEffect(() => {
  //   if (!mapRef.current || !coords) return; // Nếu map chưa sẵn sàng hoặc không có coords
  //   mapRef.current.flyTo({ center: [coords.lng, coords.lat], zoom: 18 }); // Hoặc dùng setCenter
  // }, [coords]);

  // return <MapContainer ref={mapContainerRef} />;
  return (
    <div style={{ position: "relative", width: "100%", height: "70vh", overflow: "hidden" }}>
      <MapContainer ref={mapContainerRef} />
      <NavigationOverlay notification={notification} coords={coords} speedImage={speedImage} />
    </div>
  );
}