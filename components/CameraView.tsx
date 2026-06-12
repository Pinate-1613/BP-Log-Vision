
import React, { useRef, useEffect, useCallback } from 'react';
import { CloseIcon } from './Icons';

interface CameraViewProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let isMounted = true;
    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access the camera. Please check permissions.");
        onClose();
      }
    };
    enableCamera();
    
    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onClose]);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if(context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        // remove `data:image/jpeg;base64,` prefix
        onCapture(dataUrl.split(',')[1]);
      }
    }
  }, [onCapture]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-end">
        <button onClick={onClose} className="text-white bg-black/50 rounded-full p-2">
          <CloseIcon className="w-8 h-8" />
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/50 to-transparent flex justify-center">
        <button
          onClick={handleCapture}
          className="w-20 h-20 bg-white rounded-full border-4 border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white"
          aria-label="Capture image"
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
