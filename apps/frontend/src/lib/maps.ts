export function generateGoogleMapsRoute(
  pickupLat: number,
  pickupLng: number,
  dropoffs: { latitude: number; longitude: number }[]
): string {
  if (!pickupLat || !pickupLng || dropoffs.length === 0) return '#'

  const origin = `${pickupLat},${pickupLng}`
  const destination = `${dropoffs[dropoffs.length - 1].latitude},${dropoffs[dropoffs.length - 1].longitude}`

  const waypoints = dropoffs
    .slice(0, -1) // All except the last one
    .map((d) => `${d.latitude},${d.longitude}`)
    .join('|')

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`
}

// Enhanced geocoding function for Philippine addresses
export async function geocodePhilippineAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  if (!address) return null
  
  try {
    // Try with Philippines context first
    const searchQuery = `${address}, Philippines`
    console.log(`🔍 Geocoding Philippine address: ${searchQuery}`)
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ph&limit=1`
    )
    
    if (!response.ok) {
      console.error('❌ Geocoding API request failed:', response.status)
      return null
    }
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      const result = data[0]
      console.log(`✅ Geocoding successful: ${result.lat}, ${result.lon} for "${address}"`)
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      }
    } else {
      console.warn(`❌ No geocoding results found for: ${address}`)
      
      // Fallback: try without Philippines context
      const fallbackResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      )
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        if (fallbackData && fallbackData.length > 0) {
          const result = fallbackData[0]
          console.log(`✅ Fallback geocoding successful: ${result.lat}, ${result.lon} for "${address}"`)
          return {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Geocoding failed:', error)
  }
  
  return null
}
