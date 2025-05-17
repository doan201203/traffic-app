import {useState, useEffect} from 'react'
export function useGeocode(coords, interval = 5000) {
  const [address, setAddress] = useState(null)

  useEffect(() => {
    if (!coords) return

    const fetchAddress = async () => {
      try {
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=YOUR_MAPBOX_ACCESS_TOKEN`)
        const data = await response.json()

        if (data.features && data.features.length > 0) {
          setAddress(data.features[0].place_name)
        }
      } catch (error) {
        console.error("Error fetching address:", error)
      }
    };
    
    fetchAddress();
    const id = setInterval(() => {
      fetchAddress()
    }, interval)
    
    return () => {
      clearInterval(id)
    }
  }, [coords, interval]);

  return address
}