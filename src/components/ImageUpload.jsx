import { useState, useRef } from 'react'
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react'
import api from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ImageUpload({ images = [], onChange }) {
  const [uploading, setUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const uploadFile = async (file) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange([...images, res.data.url])
    } catch (err) {
      console.error(err)
      alert('Errore upload immagine')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(uploadFile)
  }

  const removeImage = (index) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    onChange(newImages)
  }

  const openCamera = async () => {
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      alert('Impossibile accedere alla camera')
      setShowCamera(false)
    }
  }

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  const takePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0)
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
        uploadFile(file)
        closeCamera()
      },
      'image/jpeg',
      0.85
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">📸 Allegati / Foto</label>

      {/* Galleria immagini */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-3">
        {images.map((url, i) => (
          <div key={i} className="relative group">
            <img
              src={`${API_BASE}${url}`}
              alt={`Allegato ${i + 1}`}
              className="w-full h-24 object-cover rounded-lg border"
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Bottoni upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors"
        >
          <Upload size={20} />
          <span className="text-xs mt-1">{uploading ? 'Carico...' : 'File'}</span>
        </button>

        <button
          type="button"
          onClick={openCamera}
          className="h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors"
        >
          <Camera size={20} />
          <span className="text-xs mt-1">Foto</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Modal webcam */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4">
          <video ref={videoRef} autoPlay playsInline className="max-w-full max-h-[70vh] rounded-lg" />
          <div className="flex gap-4 mt-4">
            <button
              onClick={takePhoto}
              className="bg-primary text-white px-6 py-3 rounded-full flex items-center gap-2"
            >
              <Camera size={20} /> Scatta
            </button>
            <button
              onClick={closeCamera}
              className="bg-gray-600 text-white px-6 py-3 rounded-full"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
