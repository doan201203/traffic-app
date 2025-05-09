import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { MapContainer } from "./mapboxMap.styles";

mapboxgl.accessToken = 'pk.eyJ1IjoiZG9hbjIwMTIwMyIsImEiOiJjbWFiYTJudXQxNDJpMmpwdnV4NmluN285In0.LwElgr-059U7IL2Mf-sToA'

export default function MapboxMap({ coords = { lng: 105.85, lat: 21.03 } }) {
  const mapRef = useRef();
  const mapContainerRef = useRef();
  const markerRef = useRef();
  // console.log(coords, mapboxgl.accessToken);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [coords.lng, coords.lat],
      zoom: 15,
    });
    new mapboxgl.Marker().setLngLat([coords.lng, coords.lat]).addTo(mapRef.current);
    
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    });
    mapRef.current.addControl(geolocate, "top-right");

    // Thêm marker lần đầu
    // Tự động trigger geolocate khi map load (nếu muốn)
    mapRef.current.on("load", () => {
      geolocate.trigger();
    });


    return () => mapRef.current && mapRef.current.remove();
  }, [coords]);

  return <MapContainer ref={mapContainerRef} />;
}