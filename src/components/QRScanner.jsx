import { useEffect, useRef, useState } from 'react';
import { Button, Modal, Notice } from './ui.jsx';

export default function QRScanner({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const callbacksRef = useRef({ onClose, onDetected });
  const [error, setError] = useState('');

  useEffect(() => {
    callbacksRef.current = { onClose, onDetected };
  }, [onClose, onDetected]);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    let stream = null;
    let timer = null;
    setError('');

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access needs a secure HTTPS page and browser permission.');
      }
      if (!('BarcodeDetector' in window)) {
        throw new Error('QR scanning is not supported by this browser. You can paste the address manually.');
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (!active) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      timer = window.setInterval(async () => {
        if (!active || video.readyState < 2) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length && codes[0].rawValue) {
            active = false;
            window.clearInterval(timer);
            callbacksRef.current.onDetected(codes[0].rawValue);
            callbacksRef.current.onClose();
          }
        } catch {
          // Keep scanning; a single unreadable camera frame is normal.
        }
      }, 300);
    };

    start().catch((err) => {
      if (active) setError(err.message || 'Could not start the camera.');
    });

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open]);

  return (
    <Modal
      open={open}
      title="Scan wallet address"
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Close scanner</Button>}
    >
      <div className="space-y-3">
        <video
          ref={videoRef}
          muted
          playsInline
          className="aspect-video w-full rounded-md bg-ink object-cover"
        />
        {error ? (
          <Notice tone="warn">{error}</Notice>
        ) : (
          <p className="text-sm text-muted">Camera ko QR code ki taraf karein. Address milte hi recipient field fill ho jayegi.</p>
        )}
      </div>
    </Modal>
  );
}
