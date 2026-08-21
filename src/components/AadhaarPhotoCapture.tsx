'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, UploadCloud, X, RotateCw, Trash2, Eye, Check, AlertCircle } from 'lucide-react';

interface AadhaarPhotoCaptureProps {
  value?: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export default function AadhaarPhotoCapture({
  value,
  onChange,
  disabled = false
}: AadhaarPhotoCaptureProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [showFullPreview, setShowFullPreview] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera list
  useEffect(() => {
    if (isCameraActive) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setCameras(videoDevices);
          if (videoDevices.length > 0 && !selectedCameraId) {
            // Find environment (back) camera by default if available
            const backCam = videoDevices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
          }
        })
        .catch(err => {
          console.error("Error enumerating devices:", err);
        });
    }
  }, [isCameraActive]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMsg('');
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId 
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: 'environment' }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setErrorMsg("Failed to access camera. Please make sure webcam permission is granted, or select an image file instead.");
      setIsCameraActive(false);
    }
  }, [selectedCameraId, stopCamera]);

  // Start stream when camera ID or activity changes
  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isCameraActive, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas dimensions matching video resolution
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas image to base64 jpeg with 0.7 quality (approx. 30KB)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        onChange(dataUrl);
        setIsCameraActive(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = new Image();
          img.onload = () => {
            // Resize to maximum width/height, keeping aspect ratio
            const maxW = 800;
            const maxH = 600;
            let width = img.width;
            let height = img.height;
            
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Compress to JPEG at 70% quality (extremely lightweight, ~30-50KB)
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              onChange(dataUrl);
            }
          };
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    if (confirm("Are you sure you want to remove the Aadhaar ID photo?")) {
      onChange('');
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-slate-350 text-xs font-semibold mb-2">Aadhaar Card Photo (ID Proof)</label>
      
      {/* Current Preview or Choice */}
      {value ? (
        <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center group overflow-hidden max-w-sm">
          <img 
            src={value} 
            alt="Aadhaar ID Proof Preview" 
            className="h-44 w-full object-cover rounded-xl border border-slate-900 shadow-inner"
          />
          <div className="absolute inset-0 bg-slate-955/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200">
            <button
              type="button"
              onClick={() => setShowFullPreview(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Eye className="h-4 w-4 text-violet-400" />
              View Full
            </button>
            {!disabled && (
              <button
                type="button"
                onClick={clearPhoto}
                className="p-2 bg-red-650/20 border border-red-500/30 hover:bg-red-650 hover:text-white text-red-400 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            )}
          </div>
          <div className="mt-2 text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <Check className="h-3 w-3" /> Aadhaar Photo Attached
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-w-sm">
          {/* Main Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsCameraActive(true)}
              disabled={disabled}
              className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-800 hover:border-violet-500/60 rounded-2xl text-slate-350 hover:text-white transition-all gap-2 cursor-pointer group disabled:opacity-40"
            >
              <Camera className="h-6 w-6 text-violet-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold">Use Camera</span>
            </button>

            <label className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-800 hover:border-violet-500/60 rounded-2xl text-slate-350 hover:text-white transition-all gap-2 cursor-pointer group disabled:opacity-40">
              <UploadCloud className="h-6 w-6 text-violet-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold">Upload File</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
                disabled={disabled}
              />
            </label>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-[11px] flex items-start gap-2 max-w-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Camera Modal Overlay */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-850 rounded-3xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-900/50 flex justify-between items-center bg-slate-950">
              <div>
                <h4 className="text-white text-xs font-bold uppercase tracking-wider">Aadhaar Card Scanner</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Align the card flat inside the guideline frame</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraActive(false)}
                className="p-1.5 bg-slate-900 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Aadhaar Card Card Guidelines Frame Overlay */}
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="w-full aspect-[1.586/1] border-2 border-dashed border-violet-500/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center">
                  <span className="text-[10px] text-violet-400/90 font-bold bg-slate-950/80 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                    Place Aadhaar Card Here
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 bg-slate-950 flex flex-col gap-3">
              {cameras.length > 1 && (
                <div className="flex items-center gap-2 justify-center">
                  <RotateCw className="h-3.5 w-3.5 text-slate-500" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg py-1 px-3 text-[10px] text-slate-350 focus:outline-none"
                  >
                    {cameras.map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsCameraActive(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-550 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-600/10"
                >
                  <Camera className="h-4 w-4" />
                  Capture Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setShowFullPreview(false)}>
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowFullPreview(false)}
              className="absolute -top-10 right-0 text-slate-400 hover:text-white flex items-center gap-1 text-xs cursor-pointer"
            >
              <X className="h-4 w-4" /> Close
            </button>
            <img 
              src={value} 
              alt="Aadhaar ID Proof Full View" 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-slate-900"
            />
          </div>
        </div>
      )}

      {/* Hidden canvas for snapshotting */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
