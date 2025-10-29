'use client'

import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import jsQR from 'jsqr'
import { processPickupConfirmation } from '@/lib/qrCodeUtils'

interface QRScannerProps {
  onScanSuccess: (orderId: string) => void
  driverId: string // Pass driver ID from parent
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, driverId }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeImage, setQrCodeImage] = useState<File | null>(null)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const qrScannerRef = useRef<QrScanner | null>(null)

  // Handle QR code processing
  const handleQRCodeDetected = async (qrString: string) => {
    if (isProcessing) return // Prevent duplicate processing
    
    setIsProcessing(true)
    console.log('QR Code detected:', qrString)

    try {
      // Process the pickup confirmation using the utility function
      const result = await processPickupConfirmation(qrString, driverId)

      if (result.success && result.orderId) {
        setScanResult(`✅ ${result.message}`)
        
        // Stop scanner after successful scan
        if (qrScannerRef.current) {
          qrScannerRef.current.stop()
          setIsScanning(false)
        }
        
        // Call parent success callback
        onScanSuccess(result.orderId)
      } else {
        setError(result.message)
        setIsProcessing(false) // Allow retry on error
      }
    } catch (err) {
      console.error('Error processing QR code:', err)
      setError('Failed to process QR code: ' + err)
      setIsProcessing(false)
    }
  }

  // Start camera-based QR scanner
  useEffect(() => {
    if (videoRef.current && isVideoReady && !isProcessing) {
      const startScanner = async () => {
        try {
          const qrScanner = new QrScanner(
            videoRef.current!,
            (result) => handleQRCodeDetected(result.data),
            {
              returnDetailedScanResult: true,
              highlightScanRegion: true,
              highlightCodeOutline: true,
            }
          )

          qrScannerRef.current = qrScanner
          await qrScanner.start()
          setIsScanning(true)

          return () => {
            qrScanner.stop()
            setIsScanning(false)
          }
        } catch (err) {
          setError('Failed to start QR scanner: ' + err)
          console.error('QR Scanner Error:', err)
        }
      }

      startScanner()

      return () => {
        if (qrScannerRef.current) {
          qrScannerRef.current.stop()
          setIsScanning(false)
        }
      }
    }
  }, [isVideoReady, isProcessing])

  // Handle QR code image upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && !isProcessing) {
      setQrCodeImage(file)
      try {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (reader.result) {
            const img = new Image()
            img.src = reader.result as string
            img.onload = () => {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              if (ctx) {
                canvas.width = img.width
                canvas.height = img.height
                ctx.drawImage(img, 0, 0)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const qrCode = jsQR(imageData.data, canvas.width, canvas.height)
                if (qrCode) {
                  handleQRCodeDetected(qrCode.data)
                } else {
                  setError('QR code not found in image.')
                }
              }
            }
          }
        }
        reader.readAsDataURL(file)
      } catch (err) {
        setError('Error reading the image: ' + err)
      }
    }
  }

  // Handle video ready event
  const handleVideoReady = () => {
    setIsVideoReady(true)
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 font-medium">❌ Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setIsProcessing(false)
            }}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Try Again
          </button>
        </div>
      ) : scanResult ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">{scanResult}</p>
        </div>
      ) : (
        <div className="w-full max-w-md">
          {/* Upload QR code image */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload QR Code Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="w-full p-2 border-2 border-gray-300 rounded hover:border-orange-400 transition"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-3 text-sm text-gray-500">OR</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Show video feed if scanning */}
          {!qrCodeImage && !scanResult && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Scan with Camera
              </p>
              <video
                ref={videoRef}
                className="w-full rounded-lg border-2 border-gray-300 bg-black"
                onLoadedData={handleVideoReady}
                playsInline
              />
              {isScanning && (
                <div className="text-center mt-3">
                  <div className="inline-flex items-center gap-2 text-orange-600">
                    <div className="animate-pulse w-3 h-3 bg-orange-600 rounded-full"></div>
                    <span className="text-sm font-medium">Scanning for QR code...</span>
                  </div>
                </div>
              )}
              {isProcessing && (
                <div className="text-center mt-3">
                  <div className="inline-flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm font-medium">Processing...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!scanResult && !isScanning && !isProcessing && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
              <p className="text-gray-600 text-sm">
                📱 Allow camera access to scan QR codes, or upload an image of the QR code.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QRScanner