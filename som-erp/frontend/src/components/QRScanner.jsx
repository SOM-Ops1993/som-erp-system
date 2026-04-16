/**
 * QR Scanner Component
 * Uses WebRTC (getUserMedia) + jsQR for real-time camera scanning.
 * Supports mobile and desktop browsers.
 * Calls onScan(packId) on each successful unique scan.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import jsQR from 'jsqr'
import { Camera, CameraOff, Zap } from 'lucide-react'

export default function QRScanner({ onScan, active = true, lastError }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const rafRef     = useRef(null)
  const lastScan   = useRef('')

  const [cameraState, setCameraState] = useState('idle') // idle | loading | running | error
  const [cameraError, setCameraError] = useState(null)
  const [flashOn, setFlashOn] = useState(false)
  const trackRef = useRef(null)

  const startCamera = useCallback(async () => {
    setCameraState('loading')
    setCameraError(null)
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      trackRef.current = stream.getVideoTracks()[0]

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setCameraState('running')
      }
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : `Camera error: ${err.message}`
      )
      setCameraState('error')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraState('idle')
  }, [])

  // Scan loop — runs at ~10fps
  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code && code.data && code.data !== lastScan.current) {
      lastScan.current = code.data
      onScan(code.data.trim())
      // Reset after 800ms to allow re-scan of same code
      setTimeout(() => { lastScan.current = '' }, 800)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [onScan])

  useEffect(() => {
    if (active) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [active])

  // Start scan loop once camera is running
  useEffect(() => {
    if (cameraState === 'running') {
      rafRef.current = requestAnimationFrame(tick)
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [cameraState, tick])

  // Toggle flashlight
  const toggleFlash = async () => {
    if (!trackRef.current) return
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: !flashOn }] })
      setFlashOn(!flashOn)
    } catch {}
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden max-w-md mx-auto">
      {/* Video feed */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Scan overlay — animated line */}
      {cameraState === 'running' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner brackets */}
          <div className="absolute inset-6 border-2 border-transparent">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent rounded-tl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent rounded-tr" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent rounded-bl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent rounded-br" />
          </div>
          {/* Scan line */}
          <div className="absolute inset-x-6 h-0.5 bg-accent/70 scan-line" />
        </div>
      )}

      {/* Loading state */}
      {cameraState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white">
            <Camera size={40} className="mx-auto mb-3 animate-pulse" />
            <p className="text-sm">Starting camera…</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {cameraState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-4">
          <div className="text-center text-white max-w-xs">
            <CameraOff size={40} className="mx-auto mb-3 text-red-400" />
            <p className="text-sm mb-3">{cameraError}</p>
            <button onClick={startCamera} className="btn-primary text-sm">Retry</button>
          </div>
        </div>
      )}

      {/* Flashlight button (mobile) */}
      {cameraState === 'running' && (
        <button
          onClick={toggleFlash}
          className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white"
        >
          <Zap size={16} fill={flashOn ? 'yellow' : 'none'} color={flashOn ? 'yellow' : 'white'} />
        </button>
      )}

      {/* Error flash banner */}
      {lastError && (
        <div className="absolute bottom-0 inset-x-0 bg-red-600 text-white text-xs text-center py-2 px-3 font-medium">
          ❌ {lastError}
        </div>
      )}
    </div>
  )
}
