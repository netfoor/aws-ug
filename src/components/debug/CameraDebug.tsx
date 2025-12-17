'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface CameraInfo {
  id: string;
  label: string;
}

export default function CameraDebug() {
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadCameras();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const loadCameras = async () => {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          id: device.deviceId,
          label: device.label || `Camera ${device.deviceId.substring(0, 8)}...`
        }));
      
      setCameras(videoDevices);
      
      // Try to select back camera by default
      const backCamera = videoDevices.find(camera => 
        camera.label.toLowerCase().includes('back') ||
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')
      );
      
      if (backCamera) {
        setSelectedCamera(backCamera.id);
      } else if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].id);
      }
      
    } catch (err) {
      setError(`Error accessing cameras: ${err}`);
      console.error('Error loading cameras:', err);
    }
  };

  const startCamera = async (cameraId: string) => {
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setError('');

      // Display in video element
      const video = document.getElementById('debug-video') as HTMLVideoElement;
      if (video) {
        video.srcObject = newStream;
      }

    } catch (err) {
      setError(`Error starting camera: ${err}`);
      console.error('Error starting camera:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-surface rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Camera Debug Tool</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Available Cameras:</label>
        <select 
          value={selectedCamera} 
          onChange={(e) => setSelectedCamera(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Select a camera...</option>
          {cameras.map(camera => (
            <option key={camera.id} value={camera.id}>
              {camera.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 space-y-2">
        <Button 
          onClick={() => startCamera(selectedCamera)}
          disabled={!selectedCamera}
          className="w-full"
        >
          Start Camera
        </Button>
        
        <Button 
          onClick={stopCamera}
          variant="outline"
          className="w-full"
        >
          Stop Camera
        </Button>

        <Button 
          onClick={() => startCamera('')}
          variant="ghost"
          className="w-full"
        >
          Try Environment (Back) Camera
        </Button>
      </div>

      <div className="aspect-square bg-black rounded overflow-hidden">
        <video
          id="debug-video"
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
      </div>

      <div className="mt-4 text-xs text-gray-600">
        <p><strong>Camera Count:</strong> {cameras.length}</p>
        <p><strong>Selected:</strong> {selectedCamera}</p>
        <p><strong>Stream Active:</strong> {stream ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}