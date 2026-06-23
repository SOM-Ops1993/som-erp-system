export default function QRScanner({ videoRef, canvasRef }) {
  return (
    <div className="mb-5 bg-black rounded-xl overflow-hidden relative" style={{ maxWidth: 480 }}>
      <video ref={videoRef} className="w-full" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="border-2 border-green-400 rounded-lg"
          style={{ width: 200, height: 200, boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)' }}
        />
      </div>
      <p className="absolute bottom-3 w-full text-center text-white text-xs">
        Point at location QR code
      </p>
    </div>
  )
}
