import {useState, useEffect, useRef} from 'react'

// Cache for geocoded addresses to avoid redundant API calls
const geocodeCache = new Map();
// Cache expiration in milliseconds (10 minutes)
const CACHE_EXPIRATION = 10 * 60 * 1000;

export function useGeocode(coords, interval = 10000) {
  const [address, setAddress] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)
  const intervalIdRef = useRef(null)
  const lastCoordsRef = useRef(null)
  
  useEffect(() => {
    if (!coords || !process.env.REACT_APP_MAPBOX_ACCESS_TOKEN) {
      setError("Missing coordinates or Mapbox token")
      return
    }

    // Skip if coordinates haven't changed enough (for mobile devices with less accurate GPS)
    // Only update if moved more than 10 meters (approximately)
    if (lastCoordsRef.current) {
      const distance = calculateDistance(
        lastCoordsRef.current.lat, 
        lastCoordsRef.current.lng, 
        coords.lat, 
        coords.lng
      );
      
      // If moved less than 10 meters and we already have an address, don't update
      if (distance < 10 && address) {
        return;
      }
    }

    // Update last coordinates
    lastCoordsRef.current = coords;

    // Generate cache key based on coordinates (rounded to 5 decimal places for effective caching)
    const cacheKey = `${coords.lng.toFixed(5)},${coords.lat.toFixed(5)}`
    
    const fetchAddress = async () => {
      setIsLoading(true)
      
      // Check cache first
      if (geocodeCache.has(cacheKey)) {
        const cachedData = geocodeCache.get(cacheKey);
        
        // Check if cache is still valid (less than CACHE_EXPIRATION old)
        if (Date.now() - cachedData.timestamp < CACHE_EXPIRATION) {
          setAddress(cachedData.address);
          setIsLoading(false);
          return;
        } else {
          // Cache expired, remove it
          geocodeCache.delete(cacheKey);
        }
      }
      
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController()
      
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}&language=vi`,
          { signal: abortControllerRef.current.signal }
        )
        
        if (!response.ok) {
          throw new Error(`Geocoding API error: ${response.status}`)
        }
        
        const data = await response.json()

        if (data.features && data.features.length > 0) {
          const placeName = data.features[0].place_name
          setAddress(placeName)
          // Store in cache with timestamp
          geocodeCache.set(cacheKey, { 
            address: placeName, 
            timestamp: Date.now() 
          });
        } else {
          setAddress("Unknown location")
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Error fetching address:", error)
          setError(`Address lookup failed: ${error.message}`)
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    // Initial fetch
    fetchAddress()
    
    // Set up interval for periodic updates
    if (interval > 0) {
      // Clear any existing interval first
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      
      intervalIdRef.current = setInterval(() => {
        fetchAddress()
      }, interval)
    }
    
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [coords, interval, address])

  // Haversine formula to calculate distance between two coordinates in meters
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  return { address, isLoading, error }
}