'use client'

import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import jsQR from 'jsqr'

interface QRScannerProps {
  onScanSuccess: (orderId: string) => void
  updateOrderStatus: (orderId: string) => void // New function to handle order status update
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, updateOrderStatus }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeImage, setQrCodeImage] = useState<File | null>(null)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)

  // Start camera-based QR scanner
  useEffect(() => {
    if (videoRef.current && isVideoReady) {
      const startScanner = async () => {
        try {
          const qrScanner = new QrScanner(videoRef.current, (result: string) => {
            console.log('QR Scan result:', result)
            setScanResult(result)
            onScanSuccess(result) // Pass the result to the parent callback
            updateOrderStatus(result) // Update the order status
          })

          // Start the QR scanner
          await qrScanner.start()
          setIsScanning(true)

          // Cleanup when the component is unmounted
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

      // Cleanup on component unmount
      return () => {
        setIsScanning(false)
      }
    }
  }, [isVideoReady, onScanSuccess, updateOrderStatus])

  // Handle QR code image upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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
                  setScanResult(qrCode.data)
                  onScanSuccess(qrCode.data) // Pass the result to the parent callback
                  updateOrderStatus(qrCode.data) // Update the order status
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
    <div className="flex justify-center items-center">
      {error ? (
        <div className="text-red-500">Error: {error}</div>
      ) : scanResult ? (
        <div>
          <div className="text-green-500">QR Code Scanned: {scanResult}</div>
        </div>
      ) : (
        <div>
          {/* Upload QR code image */}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mb-4 p-2 border-2 border-gray-300 rounded"
          />
          {/* Show video feed if scanning */}
          {!qrCodeImage && !scanResult && isScanning && (
            <div>
              <video
                ref={videoRef}
                className="w-full max-w-md border-2 border-gray-300"
                onLoadedData={handleVideoReady} // Wait for video to be ready
              />
              <div className="text-gray-500 mt-4">Scanning...</div>
            </div>
          )}
          {/* Provide instructions */}
          {!scanResult && !qrCodeImage && !isScanning && (
            <div className="text-gray-500 mt-4">Upload a QR code image to scan or allow camera access.</div>
          )}
        </div>
      )}
    </div>
  )
}

export default QRScanner
