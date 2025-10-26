import { useEffect, useState } from 'react'

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================
export const PRICING_CONFIG = {
  BASE_PRICE: 20000, // Base price in PHP
  
  // Warehouse location - Robinsons Place Malolos, Bulacan
  WAREHOUSE_COORDS: {
    lat: 14.8506156,
    lon: 120.8238576,
    name: "Robinsons Place Malolos"
  },
  
  // Distance-based pricing (per kilometer)
  PRICE_PER_KM: 15,
  WAREHOUSE_PICKUP_RATE: 12, // Slightly lower rate for warehouse to pickup (optional)
  
  // PRICING STRATEGY OPTIONS:
  // 'ONE_WAY' - Charges for warehouse → pickup → dropoffs only
  // 'ROUND_TRIP' - Charges for full round trip (warehouse → route → warehouse)
  // 'ONE_WAY_PLUS_RETURN' - Charges full rate one way, reduced rate for return
  DISTANCE_CALCULATION_MODE: 'ROUND_TRIP' as 'ONE_WAY' | 'ROUND_TRIP' | 'ONE_WAY_PLUS_RETURN',
  RETURN_TRIP_RATE: 0.5, // 50% rate for return trip (only used in 'ONE_WAY_PLUS_RETURN' mode)
  
  // Vehicle type multipliers
  VEHICLE_MULTIPLIERS: {
    'van': 1.0,
    '6-wheeler': 1.5,
    '10-ton truck': 2.0,
  },
  
  // Per dropoff charges
  FIRST_DROPOFF: 0, // Included in base
  ADDITIONAL_DROPOFF: 500, // Each additional dropoff after the first
  
  // Additional fees
  TAIL_LIFT_FEE: 1000,
  FRAGILE_ITEM_FEE: 300, // Per fragile item
  
  // Weight-based pricing (per kg over threshold)
  WEIGHT_THRESHOLD: 100, // kg
  PRICE_PER_KG_OVER: 10,
  
  // Volume-based pricing (per m³ over threshold)
  VOLUME_THRESHOLD: 5, // m³
  PRICE_PER_VOLUME_OVER: 200,
  
  // Minimum distance before distance charges apply
  MIN_DISTANCE_KM: 10,
}

// ============================================================================
// TYPES
// ============================================================================
export type Dropoff = {
  name: string
  address: string
  contact: string
  phone: string
  latitude?: number
  longitude?: number
}

export type OrderProduct = {
  product_id: string | null
  product_name: string
  quantity: number
  isNewProduct: boolean
  weight?: number
  volume?: number
  is_fragile?: boolean
}

export type DistanceBreakdown = {
  warehouseToPickup: number
  deliveryRoute: number
  returnToWarehouse: number
  totalDistance: number
  chargeableDistance: number
  distanceCost: number
}

export type PricingResult = {
  totalCost: number
  distanceBreakdown: DistanceBreakdown
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two points using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in km
}

/**
 * Main pricing calculation function
 */
export const calculateEstimatedCost = (
  pickupCoords: { lat: number; lon: number } | null,
  dropoffs: Dropoff[],
  orderProducts: OrderProduct[],
  truckType: string,
  tailLiftRequired: boolean
): PricingResult => {
  let totalCost = PRICING_CONFIG.BASE_PRICE

  // 1. Calculate warehouse to pickup distance
  let warehouseToPickupDistance = 0
  if (pickupCoords) {
    warehouseToPickupDistance = calculateDistance(
      PRICING_CONFIG.WAREHOUSE_COORDS.lat,
      PRICING_CONFIG.WAREHOUSE_COORDS.lon,
      pickupCoords.lat,
      pickupCoords.lon
    )
  }

  // 2. Calculate delivery route distance (pickup to all dropoffs)
  let deliveryRouteDistance = 0
  let lastDropoffCoords = pickupCoords

  if (pickupCoords) {
    let currentLat = pickupCoords.lat
    let currentLon = pickupCoords.lon

    for (const dropoff of dropoffs) {
      if (dropoff.latitude && dropoff.longitude) {
        const distance = calculateDistance(
          currentLat,
          currentLon,
          dropoff.latitude,
          dropoff.longitude
        )
        deliveryRouteDistance += distance
        currentLat = dropoff.latitude
        currentLon = dropoff.longitude
        lastDropoffCoords = { lat: dropoff.latitude, lon: dropoff.longitude }
      }
    }
  }

  // 3. Calculate return distance from last dropoff to warehouse
  let returnToWarehouseDistance = 0
  if (lastDropoffCoords) {
    returnToWarehouseDistance = calculateDistance(
      lastDropoffCoords.lat,
      lastDropoffCoords.lon,
      PRICING_CONFIG.WAREHOUSE_COORDS.lat,
      PRICING_CONFIG.WAREHOUSE_COORDS.lon
    )
  }

  // 4. Calculate total distance based on pricing strategy
  let chargeableDistance = 0
  let outboundDistance = warehouseToPickupDistance + deliveryRouteDistance

  switch (PRICING_CONFIG.DISTANCE_CALCULATION_MODE) {
    case 'ONE_WAY':
      chargeableDistance = Math.max(0, outboundDistance - PRICING_CONFIG.MIN_DISTANCE_KM)
      break

    case 'ROUND_TRIP':
      const totalRoundTrip = outboundDistance + returnToWarehouseDistance
      chargeableDistance = Math.max(0, totalRoundTrip - PRICING_CONFIG.MIN_DISTANCE_KM)
      break

    case 'ONE_WAY_PLUS_RETURN':
      const outboundCharge = Math.max(0, outboundDistance - PRICING_CONFIG.MIN_DISTANCE_KM)
      const returnCharge = returnToWarehouseDistance * PRICING_CONFIG.RETURN_TRIP_RATE
      chargeableDistance = outboundCharge + returnCharge
      break
  }

  const distanceCost = chargeableDistance * PRICING_CONFIG.PRICE_PER_KM
  totalCost += distanceCost

  const distanceBreakdown: DistanceBreakdown = {
    warehouseToPickup: warehouseToPickupDistance,
    deliveryRoute: deliveryRouteDistance,
    returnToWarehouse: returnToWarehouseDistance,
    totalDistance: outboundDistance + returnToWarehouseDistance,
    chargeableDistance: chargeableDistance,
    distanceCost: distanceCost
  }

  // 2. Vehicle type multiplier
  const vehicleMultiplier = PRICING_CONFIG.VEHICLE_MULTIPLIERS[truckType as keyof typeof PRICING_CONFIG.VEHICLE_MULTIPLIERS] || 1.0
  totalCost *= vehicleMultiplier

  // 3. Additional dropoff charges
  const validDropoffs = dropoffs.filter(d => d.address.trim() !== '')
  if (validDropoffs.length > 1) {
    const additionalDropoffs = validDropoffs.length - 1
    totalCost += additionalDropoffs * PRICING_CONFIG.ADDITIONAL_DROPOFF
  }

  // 4. Tail lift fee
  if (tailLiftRequired) {
    totalCost += PRICING_CONFIG.TAIL_LIFT_FEE
  }

  // 5. Calculate total weight and volume
  let totalWeight = 0
  let totalVolume = 0
  let fragileItemCount = 0

  for (const op of orderProducts) {
    if (op.weight) {
      totalWeight += op.weight * op.quantity
    }
    if (op.volume) {
      totalVolume += op.volume * op.quantity
    }
    if (op.is_fragile) {
      fragileItemCount += op.quantity
    }
  }

  // 6. Weight surcharge
  if (totalWeight > PRICING_CONFIG.WEIGHT_THRESHOLD) {
    const excessWeight = totalWeight - PRICING_CONFIG.WEIGHT_THRESHOLD
    totalCost += excessWeight * PRICING_CONFIG.PRICE_PER_KG_OVER
  }

  // 7. Volume surcharge
  if (totalVolume > PRICING_CONFIG.VOLUME_THRESHOLD) {
    const excessVolume = totalVolume - PRICING_CONFIG.VOLUME_THRESHOLD
    totalCost += excessVolume * PRICING_CONFIG.PRICE_PER_VOLUME_OVER
  }

  // 8. Fragile items fee
  totalCost += fragileItemCount * PRICING_CONFIG.FRAGILE_ITEM_FEE

  return { totalCost: Math.round(totalCost), distanceBreakdown }
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

type UsePricingCalculatorParams = {
  pickupLatitude?: number
  pickupLongitude?: number
  dropoffs: Dropoff[]
  orderProducts: OrderProduct[]
  truckType?: string
  tailLiftRequired?: boolean
}

export const usePricingCalculator = ({
  pickupLatitude,
  pickupLongitude,
  dropoffs,
  orderProducts,
  truckType,
  tailLiftRequired
}: UsePricingCalculatorParams) => {
  const [estimatedCost, setEstimatedCost] = useState<number>(PRICING_CONFIG.BASE_PRICE)
  const [distanceBreakdown, setDistanceBreakdown] = useState<DistanceBreakdown | null>(null)

  useEffect(() => {
    const pickupCoords = pickupLatitude && pickupLongitude
      ? { lat: pickupLatitude, lon: pickupLongitude }
      : null

    const validDropoffs = dropoffs.filter(d =>
      d.address.trim() !== '' && d.latitude && d.longitude
    )

    // Only calculate if we have minimum required data
    if (pickupCoords && validDropoffs.length > 0 && truckType) {
      const { totalCost, distanceBreakdown: breakdown } = calculateEstimatedCost(
        pickupCoords,
        validDropoffs,
        orderProducts,
        truckType,
        tailLiftRequired || false
      )

      setEstimatedCost(totalCost)
      setDistanceBreakdown(breakdown)
    } else {
      // Set to base price if insufficient data
      setEstimatedCost(PRICING_CONFIG.BASE_PRICE)
      setDistanceBreakdown(null)
    }
  }, [pickupLatitude, pickupLongitude, dropoffs, orderProducts, truckType, tailLiftRequired])

  return { estimatedCost, distanceBreakdown }
}

// ============================================================================
// PRICE BREAKDOWN COMPONENT
// ============================================================================

type PriceBreakdownProps = {
  pickupLatitude?: number
  pickupLongitude?: number
  dropoffs: Dropoff[]
  orderProducts: OrderProduct[]
  truckType?: string
  tailLiftRequired?: boolean
  estimatedCost: number
}

export const PriceBreakdown = ({
  pickupLatitude,
  pickupLongitude,
  dropoffs,
  orderProducts,
  truckType,
  tailLiftRequired,
  estimatedCost
}: PriceBreakdownProps) => {
  const pickupCoords = pickupLatitude && pickupLongitude
    ? { lat: pickupLatitude, lon: pickupLongitude }
    : null

  if (!pickupCoords || !truckType || dropoffs.filter(d => d.latitude && d.longitude).length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded border border-gray-300">
        <p className="text-sm text-gray-600">
          💡 Complete pickup address, dropoff addresses, and select vehicle type to see price breakdown
        </p>
        <p className="text-lg font-bold text-gray-900 mt-2">
          Base Price: ₱{PRICING_CONFIG.BASE_PRICE.toLocaleString()}
        </p>
      </div>
    )
  }

  // Calculate breakdown details
  let warehouseToPickupDistance = 0
  let deliveryRouteDistance = 0
  let returnToWarehouseDistance = 0

  // Warehouse to pickup
  warehouseToPickupDistance = calculateDistance(
    PRICING_CONFIG.WAREHOUSE_COORDS.lat,
    PRICING_CONFIG.WAREHOUSE_COORDS.lon,
    pickupCoords.lat,
    pickupCoords.lon
  )

  // Pickup through all dropoffs
  let currentLat = pickupCoords.lat
  let currentLon = pickupCoords.lon
  let lastDropoffCoords = pickupCoords

  for (const dropoff of dropoffs) {
    if (dropoff.latitude && dropoff.longitude) {
      deliveryRouteDistance += calculateDistance(currentLat, currentLon, dropoff.latitude, dropoff.longitude)
      currentLat = dropoff.latitude
      currentLon = dropoff.longitude
      lastDropoffCoords = { lat: dropoff.latitude, lon: dropoff.longitude }
    }
  }

  // Return to warehouse
  returnToWarehouseDistance = calculateDistance(
    lastDropoffCoords.lat,
    lastDropoffCoords.lon,
    PRICING_CONFIG.WAREHOUSE_COORDS.lat,
    PRICING_CONFIG.WAREHOUSE_COORDS.lon
  )

  const outboundDistance = warehouseToPickupDistance + deliveryRouteDistance
  const totalDistance = outboundDistance + returnToWarehouseDistance

  // Calculate chargeable distance based on mode
  let chargeableDistance = 0
  switch (PRICING_CONFIG.DISTANCE_CALCULATION_MODE) {
    case 'ONE_WAY':
      chargeableDistance = Math.max(0, outboundDistance - PRICING_CONFIG.MIN_DISTANCE_KM)
      break
    case 'ROUND_TRIP':
      chargeableDistance = Math.max(0, totalDistance - PRICING_CONFIG.MIN_DISTANCE_KM)
      break
    case 'ONE_WAY_PLUS_RETURN':
      const outbound = Math.max(0, outboundDistance - PRICING_CONFIG.MIN_DISTANCE_KM)
      const returnCharge = returnToWarehouseDistance * PRICING_CONFIG.RETURN_TRIP_RATE
      chargeableDistance = outbound + returnCharge
      break
  }

  const validDropoffs = dropoffs.filter(d => d.address.trim() !== '')
  const additionalDropoffs = Math.max(0, validDropoffs.length - 1)

  let totalWeight = 0
  let totalVolume = 0
  let fragileCount = 0

  for (const op of orderProducts) {
    totalWeight += (op.weight || 0) * op.quantity
    totalVolume += (op.volume || 0) * op.quantity
    if (op.is_fragile) fragileCount += op.quantity
  }

  return (
    <div className="bg-blue-50 p-4 rounded border border-blue-300 space-y-2">
      <h3 className="font-semibold text-gray-900">💰 Price Breakdown</h3>

      {/* Distance Calculation Mode Indicator */}
      <div className="text-xs bg-blue-100 px-2 py-1 rounded">
        <strong>Pricing Mode:</strong> {
          PRICING_CONFIG.DISTANCE_CALCULATION_MODE === 'ONE_WAY' ? '🔵 One-Way Only' :
          PRICING_CONFIG.DISTANCE_CALCULATION_MODE === 'ROUND_TRIP' ? '🔄 Full Round Trip' :
          '🔄 One-Way + 50% Return'
        }
      </div>

      <div className="text-sm space-y-1 text-gray-700">
        <div className="flex justify-between">
          <span>Base Price:</span>
          <span>₱{PRICING_CONFIG.BASE_PRICE.toLocaleString()}</span>
        </div>

        {/* Distance Details */}
        {warehouseToPickupDistance > 0 && (
          <>
            <div className="border-t border-blue-200 pt-1 mt-1">
              <div className="text-xs font-semibold text-blue-800 mb-1">Distance Breakdown:</div>
            </div>
            <div className="flex justify-between text-blue-700 pl-2">
              <span>🏭 Warehouse → Pickup:</span>
              <span>{warehouseToPickupDistance.toFixed(1)} km</span>
            </div>
          </>
        )}
        {deliveryRouteDistance > 0 && (
          <div className="flex justify-between text-blue-700 pl-2">
            <span>📦 Delivery Route:</span>
            <span>{deliveryRouteDistance.toFixed(1)} km</span>
          </div>
        )}
        {returnToWarehouseDistance > 0 && PRICING_CONFIG.DISTANCE_CALCULATION_MODE !== 'ONE_WAY' && (
          <div className="flex justify-between text-blue-700 pl-2">
            <span>🔙 Return to Warehouse:</span>
            <span>{returnToWarehouseDistance.toFixed(1)} km {
              PRICING_CONFIG.DISTANCE_CALCULATION_MODE === 'ONE_WAY_PLUS_RETURN'
                ? `(${PRICING_CONFIG.RETURN_TRIP_RATE * 100}% rate)`
                : ''
            }</span>
          </div>
        )}
        {totalDistance > 0 && (
          <div className="flex justify-between font-medium bg-blue-100 px-2 py-1 rounded">
            <span>Total Route Distance:</span>
            <span>{totalDistance.toFixed(1)} km</span>
          </div>
        )}
        {chargeableDistance > 0 && (
          <div className="flex justify-between font-semibold">
            <span>Distance Charge ({chargeableDistance.toFixed(1)} km × ₱{PRICING_CONFIG.PRICE_PER_KM}):</span>
            <span>₱{(chargeableDistance * PRICING_CONFIG.PRICE_PER_KM).toLocaleString()}</span>
          </div>
        )}
        {truckType && PRICING_CONFIG.VEHICLE_MULTIPLIERS[truckType as keyof typeof PRICING_CONFIG.VEHICLE_MULTIPLIERS] > 1 && (
          <div className="flex justify-between">
            <span>Vehicle Type Multiplier (x{PRICING_CONFIG.VEHICLE_MULTIPLIERS[truckType as keyof typeof PRICING_CONFIG.VEHICLE_MULTIPLIERS]}):</span>
            <span>Applied</span>
          </div>
        )}
        {additionalDropoffs > 0 && (
          <div className="flex justify-between">
            <span>Additional Dropoffs ({additionalDropoffs}):</span>
            <span>₱{(additionalDropoffs * PRICING_CONFIG.ADDITIONAL_DROPOFF).toLocaleString()}</span>
          </div>
        )}
        {tailLiftRequired && (
          <div className="flex justify-between">
            <span>Tail Lift:</span>
            <span>₱{PRICING_CONFIG.TAIL_LIFT_FEE.toLocaleString()}</span>
          </div>
        )}
        {totalWeight > PRICING_CONFIG.WEIGHT_THRESHOLD && (
          <div className="flex justify-between">
            <span>Excess Weight ({(totalWeight - PRICING_CONFIG.WEIGHT_THRESHOLD).toFixed(1)} kg):</span>
            <span>₱{((totalWeight - PRICING_CONFIG.WEIGHT_THRESHOLD) * PRICING_CONFIG.PRICE_PER_KG_OVER).toLocaleString()}</span>
          </div>
        )}
        {totalVolume > PRICING_CONFIG.VOLUME_THRESHOLD && (
          <div className="flex justify-between">
            <span>Excess Volume ({(totalVolume - PRICING_CONFIG.VOLUME_THRESHOLD).toFixed(2)} m³):</span>
            <span>₱{((totalVolume - PRICING_CONFIG.VOLUME_THRESHOLD) * PRICING_CONFIG.PRICE_PER_VOLUME_OVER).toLocaleString()}</span>
          </div>
        )}
        {fragileCount > 0 && (
          <div className="flex justify-between">
            <span>Fragile Items ({fragileCount}):</span>
            <span>₱{(fragileCount * PRICING_CONFIG.FRAGILE_ITEM_FEE).toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="border-t border-blue-300 pt-2 mt-2">
        <div className="flex justify-between font-bold text-lg text-gray-900">
          <span>Total Estimated Cost:</span>
          <span>₱{estimatedCost?.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}