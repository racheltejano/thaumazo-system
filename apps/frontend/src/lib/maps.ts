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
