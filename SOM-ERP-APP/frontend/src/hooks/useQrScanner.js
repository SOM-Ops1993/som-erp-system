import { useRef, useState, useEffect, useCallback } from 'react'
import jsQR from 'jsqr'

// Always render <video ref={videoRef}> and <canvas ref={canvasRef}> in the component — hidden when not scanning.
// The fix for "scanner not working": video element must always be in the DOM so refs are never null.
export function useQrScanner(onScan, { cooldown = 2000 } = {}) {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const scanningRef = useRef(false)
  const lastScanRef = useRef(0)
  const [active, setActive]   = useState(false)
  const [camError, setCamErr] = useState('')

  // Start camera AFTER React has rendered the video element into the DOM
  useEffect(() => {
    if (!active) return
    let cancelled = false
    ;(async () => {
      setCamErr('')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.onloadedmetadata = () => {
          video.play()
          scanningRef.current = true
          loop()
        }
      } catch (e) {
        setCamErr('Camera unavailable: ' + e.message)
        setActive(false)
      }
    })()
    return () => {
      cancelled = true
      stop()
    }
  }, [active])

  const loop = useCallback(() => {
    if (!scanningRef.current) return
    requestAnimationFrame(() => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) { if (scanningRef.current) loop(); return }
      const ctx = canvas.getContext('2d')
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      const now = Date.now()
      if (code?.data && now - lastScanRef.current > cooldown) {
        lastScanRef.current = now
        onScan(code.data)
      }
      if (scanningRef.current) loop()
    })
  }, [onScan, cooldown])

  const stop = () => {
    scanningRef.current = false
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setActive(false)
  }

  return { videoRef, canvasRef, active, camError, start: () => setActive(true), stop }
}
