import {useState, useEffect, useRef} from 'react'

// Cache for geocoded addresses to avoid redundant API calls
const geocodeCache = new Map();

export function useGeocode(coords, interval = 10000) {
  const [address, setAddress] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)
  const intervalIdRef = useRef(null)
  
  useEffect(() => {
    if (!coords || !process.env.REACT_APP_MAPBOX_ACCESS_TOKEN) {
      setError("Missing coordinates or Mapbox token")
      return
    }

    // Generate cache key based on coordinates (rounded to 5 decimal places for effective caching)
    const cacheKey = `${coords.lng.toFixed(5)},${coords.lat.toFixed(5)}`
    
    const fetchAddress = async () => {
      setIsLoading(true)
      
      // Check cache first
      if (geocodeCache.has(cacheKey)) {
        setAddress(geocodeCache.get(cacheKey))
        setIsLoading(false)
        return
      }
      
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController()
      
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}`,
          { signal: abortControllerRef.current.signal }
        )
        
        if (!response.ok) {
          throw new Error(`Geocoding API error: ${response.status}`)
        }
        
        const data = await response.json()

        if (data.features && data.features.length > 0) {
          const placeName = data.features[0].place_name
          setAddress(placeName)
          // Store in cache
          geocodeCache.set(cacheKey, placeName)
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
  }, [coords, interval])

  return { address, isLoading, error }
}