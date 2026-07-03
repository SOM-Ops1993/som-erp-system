/**
 * QR Scanner — uses device camera via html5-qrcode-like approach with jsqr
 * Scans continuously, reports decoded pack_id
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import jsQR from 'jsqr'

export default function QRScanner({ onScan, onClose, label = 'Scan QR Code' }) {
  const videoRef = useRef()
  const canvasRef = useRef()
  const rafRef = useRef()
  const streamRef = useRef()
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const lastScanRef = useRef(null)

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
    if (code?.data && code.data !== lastScanRef.current) {
      lastScanRef.current = code.data
      setLastScan(code.data)
      onScan(code.data)
      // Debounce — prevent re-scan of same code for 2s
      setTimeout(() => { lastScanRef.current = null }, 2000)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [onScan])

  useEffect(() => {
    let mounted = true
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().then(() => {
            setScanning(true)
            rafRef.current = requestAnimationFrame(tick)
          })
        }
      })
      .catch(err => {
        setError(`Camera error: ${err.message}. Please allow camera access.`)
      })
    return () => {
      mounted = false
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [tick])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>{label}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        {error ? (
          <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>{error}</div>
        ) : (
          <>
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} style={{ width: '100%', display: 'block' }} muted playsInline />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {/* Targeting overlay */}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
              }}>
                <div style={{
                  width: '60%', height: '60%', border: '2px solid #3b82f6', borderRadius: '8px',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                }} />
              </div>
            </div>
            <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
              {scanning ? '📷 Scanning… Point camera at QR code' : 'Starting camera…'}
            </div>
            {lastScan && (
              <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '6px', fontSize: '12px', color: '#16a34a', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                ✓ Scanned: {lastScan.slice(0, 40)}{lastScan.length > 40 ? '…' : ''}
              </div>
            )}
          </>
        )}

        {/* Manual entry fallback */}
        <ManualEntry onScan={onScan} />
      </div>
    </div>
  )
}

function ManualEntry({ onScan }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>Or enter Pack ID manually:</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onScan(val.trim()); setVal('') } }}
          placeholder="Paste or type Pack ID…"
          style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}
        />
        <button
          onClick={() => { if (val.trim()) { onScan(val.trim()); setVal('') } }}
          style={{ padding: '7px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
        >
          Submit
        </button>
      </div>
    </div>
  )
}
