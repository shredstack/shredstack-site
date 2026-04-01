'use client';

import { useCallback, useState, useRef } from 'react';

interface UploadResult {
  newScoreCount: number;
  newWorkoutCount: number;
  totalScoreCount: number;
  duplicatesSkipped: number;
  monthlyChallengesDetected: number;
}

interface CsvUploadProps {
  onUploadComplete: (result: UploadResult) => void;
}

export default function CsvUpload({ onUploadComplete }: CsvUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv')) {
        setStatus('error');
        setErrorMessage('Please upload a CSV file.');
        return;
      }

      setStatus('uploading');
      setErrorMessage('');

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/smart-cfd/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        onUploadComplete(data);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div className="max-w-xl mx-auto">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          card p-12 text-center cursor-pointer transition-all duration-200
          ${dragOver ? 'border-accent-400 bg-accent-500/10' : 'hover:border-surface-500'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {status === 'uploading' ? (
          <div>
            <div className="text-4xl mb-4 animate-pulse">📤</div>
            <p className="text-white font-medium mb-2">Processing your data...</p>
            <p className="text-surface-400 text-sm">Parsing CSV and storing workouts</p>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4">📁</div>
            <p className="text-white font-medium mb-2">
              Drop your PushPress CSV here
            </p>
            <p className="text-surface-400 text-sm mb-4">or click to browse</p>
            <p className="text-surface-500 text-xs">
              Export from PushPress: Members &rarr; Scores &rarr; Export
            </p>
          </div>
        )}
      </div>

      {status === 'error' && (
        <div className="mt-4 card p-4 border-red-500/30">
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
