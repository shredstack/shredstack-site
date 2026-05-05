'use client';

import Link from 'next/link';
import { useState } from 'react';
import { upload } from '@vercel/blob/client';
import type { MobilityExercise } from '@/db/schema';
import {
  CATEGORY_HINT,
  CATEGORY_LABELS,
  isDailyCategory,
  type MobilityCategory,
  type MobilityDay,
} from '@/lib/mobility/program';

interface Props {
  initialExercises: MobilityExercise[];
}

interface RowState {
  saving: boolean;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
}

const DEFAULT_ROW_STATE: RowState = {
  saving: false,
  uploading: false,
  uploadProgress: 0,
  error: null,
};

const DAYS: MobilityDay[] = [1, 2, 3];

export default function AdminClient({ initialExercises }: Props) {
  const [exercises, setExercises] = useState<MobilityExercise[]>(initialExercises);
  const [rowState, setRowState] = useState<Record<number, RowState>>({});
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  function getRowState(id: number): RowState {
    return rowState[id] ?? DEFAULT_ROW_STATE;
  }

  function updateRowState(id: number, patch: Partial<RowState>) {
    setRowState((prev) => ({
      ...prev,
      [id]: { ...DEFAULT_ROW_STATE, ...prev[id], ...patch },
    }));
  }

  function patchExercise(id: number, patch: Partial<MobilityExercise>) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)),
    );
  }

  async function saveField(
    id: number,
    field: 'name' | 'setsReps' | 'notes' | 'videoUrl',
    value: string | null,
  ) {
    updateRowState(id, { saving: true, error: null });
    try {
      const res = await fetch('/api/mobility/exercises', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: value }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Save failed');
      }
      updateRowState(id, { saving: false });
    } catch (err) {
      updateRowState(id, {
        saving: false,
        error: err instanceof Error ? err.message : 'Save failed',
      });
    }
  }

  async function handleFile(id: number, file: File) {
    updateRowState(id, { uploading: true, uploadProgress: 0, error: null });
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/mobility/upload-url',
        clientPayload: JSON.stringify({ exerciseId: id }),
        onUploadProgress: (p) => updateRowState(id, { uploadProgress: p.percentage }),
      });
      patchExercise(id, { videoUrl: blob.url, videoFilename: blob.pathname });
      updateRowState(id, { uploading: false, uploadProgress: 100 });
    } catch (err) {
      updateRowState(id, {
        uploading: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }

  async function clearVideo(id: number) {
    if (!window.confirm('Remove the video link from this exercise? (The blob file is not deleted.)')) {
      return;
    }
    patchExercise(id, { videoUrl: null, videoFilename: null });
    await saveField(id, 'videoUrl', null);
  }

  async function handleAdd(category: MobilityCategory, day: MobilityDay | null) {
    const key = sectionKey(category, day);
    setCreatingFor(key);
    setGlobalError(null);
    try {
      const res = await fetch('/api/mobility/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, day: day ?? undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to add');
      }
      const data = await res.json();
      setExercises((prev) => [...prev, data.exercise]);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setCreatingFor(null);
    }
  }

  async function handleDelete(ex: MobilityExercise) {
    const ok = window.confirm(
      `Delete "${ex.name}"? This also removes any past completion history for this item.`,
    );
    if (!ok) return;
    setGlobalError(null);
    try {
      const res = await fetch(`/api/mobility/exercises/${ex.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Delete failed');
      }
      setExercises((prev) => prev.filter((e) => e.id !== ex.id));
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="py-8 md:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">
              <span className="text-gradient-rainbow">Mobility Admin</span>
            </h1>
            <p className="text-surface-400 text-sm mt-1">
              Add, edit, and delete program items.
            </p>
          </div>
          <Link
            href="/playground/mobility"
            className="text-sm text-surface-400 hover:text-rainbow-cyan transition-colors"
          >
            ← Back
          </Link>
        </div>

        {globalError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400 flex items-center justify-between">
            <span>{globalError}</span>
            <button
              onClick={() => setGlobalError(null)}
              className="text-red-300 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-8">
          {DAYS.map((day) => (
            <Section
              key={`day-${day}`}
              title={`Day ${day} — Exercises`}
              hint={null}
              category="exercise"
              day={day}
              creatingKey={creatingFor}
              addLabel="+ Add exercise"
              items={exercises.filter(
                (ex) => ex.day === day && ex.category === 'exercise',
              )}
              onAdd={handleAdd}
              onDelete={handleDelete}
              onSaveField={(id, field, value) => {
                patchExercise(id, { [field]: value } as Partial<MobilityExercise>);
                saveField(id, field, value);
              }}
              onUpload={handleFile}
              onClearVideo={clearVideo}
              getRowState={getRowState}
            />
          ))}

          <Section
            title="Stretches"
            hint={CATEGORY_HINT.stretch}
            category="stretch"
            day={null}
            creatingKey={creatingFor}
            addLabel="+ Add stretch"
            items={exercises.filter((ex) => ex.category === 'stretch')}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onSaveField={(id, field, value) => {
              patchExercise(id, { [field]: value } as Partial<MobilityExercise>);
              saveField(id, field, value);
            }}
            onUpload={handleFile}
            onClearVideo={clearVideo}
            getRowState={getRowState}
          />

          <Section
            title="Recovery at Athlecare"
            hint={null}
            category="recovery_at_athlecare"
            day={null}
            creatingKey={creatingFor}
            addLabel="+ Add recovery item"
            items={exercises.filter((ex) => ex.category === 'recovery_at_athlecare')}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onSaveField={(id, field, value) => {
              patchExercise(id, { [field]: value } as Partial<MobilityExercise>);
              saveField(id, field, value);
            }}
            onUpload={handleFile}
            onClearVideo={clearVideo}
            getRowState={getRowState}
          />
        </div>
      </div>
    </div>
  );
}

function sectionKey(category: MobilityCategory, day: MobilityDay | null): string {
  return `${category}:${day ?? 'null'}`;
}

interface SectionProps {
  title: string;
  hint: string | null;
  category: MobilityCategory;
  day: MobilityDay | null;
  creatingKey: string | null;
  addLabel: string;
  items: MobilityExercise[];
  onAdd: (category: MobilityCategory, day: MobilityDay | null) => void;
  onDelete: (ex: MobilityExercise) => void;
  onSaveField: (
    id: number,
    field: 'name' | 'setsReps' | 'notes' | 'videoUrl',
    value: string | null,
  ) => void;
  onUpload: (id: number, file: File) => void;
  onClearVideo: (id: number) => void;
  getRowState: (id: number) => RowState;
}

function Section({
  title,
  hint,
  category,
  day,
  creatingKey,
  addLabel,
  items,
  onAdd,
  onDelete,
  onSaveField,
  onUpload,
  onClearVideo,
  getRowState,
}: SectionProps) {
  const isCreating = creatingKey === sectionKey(category, day);
  const sortedItems = [...items].sort((a, b) => {
    if (a.orderInDay !== b.orderInDay) return a.orderInDay - b.orderInDay;
    return a.id - b.id;
  });

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {hint && <span className="text-xs text-surface-500">{hint}</span>}
      </div>

      <div className="space-y-3">
        {sortedItems.length === 0 ? (
          <div className="card p-4 text-center text-sm text-surface-500">
            No items yet. Click below to add one.
          </div>
        ) : (
          sortedItems.map((ex) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              state={getRowState(ex.id)}
              onSaveField={(field, value) => onSaveField(ex.id, field, value)}
              onUpload={(file) => onUpload(ex.id, file)}
              onClearVideo={() => onClearVideo(ex.id)}
              onDelete={() => onDelete(ex)}
            />
          ))
        )}

        <button
          onClick={() => onAdd(category, day)}
          disabled={isCreating}
          className="w-full py-3 px-4 rounded-lg border border-dashed border-surface-700 text-surface-400 text-sm hover:border-rainbow-cyan/40 hover:text-rainbow-cyan disabled:opacity-50 transition-colors"
        >
          {isCreating ? 'Adding…' : addLabel}
        </button>
      </div>
    </section>
  );
}

interface ExerciseRowProps {
  exercise: MobilityExercise;
  state: RowState;
  onSaveField: (field: 'name' | 'setsReps' | 'notes' | 'videoUrl', value: string | null) => void;
  onUpload: (file: File) => void;
  onClearVideo: () => void;
  onDelete: () => void;
}

function ExerciseRow({
  exercise,
  state,
  onSaveField,
  onUpload,
  onClearVideo,
  onDelete,
}: ExerciseRowProps) {
  const cat = exercise.category as MobilityCategory;
  const showSetsReps = cat === 'exercise';

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-surface-500">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-surface-800 border border-surface-700">
                #{exercise.orderInDay}
              </span>
              <span>{CATEGORY_LABELS[cat] ?? exercise.category}</span>
              {isDailyCategory(cat) && (
                <span className="text-rainbow-teal">· daily</span>
              )}
            </div>
            <button
              onClick={onDelete}
              aria-label="Delete item"
              className="text-surface-600 hover:text-red-400 transition-colors p-1"
              title="Delete"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                />
              </svg>
            </button>
          </div>

          <input
            defaultValue={exercise.name}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v && v !== exercise.name) onSaveField('name', v);
            }}
            className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-surface-100 text-sm focus:outline-none focus:border-rainbow-cyan/50"
          />

          {showSetsReps && (
            <input
              defaultValue={exercise.setsReps ?? ''}
              placeholder="sets x reps (e.g. 3x6)"
              onBlur={(e) => {
                const v = e.currentTarget.value.trim();
                const next = v === '' ? null : v;
                if (next !== (exercise.setsReps ?? null)) onSaveField('setsReps', next);
              }}
              className="w-32 bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-surface-100 text-xs focus:outline-none focus:border-rainbow-cyan/50"
            />
          )}

          <textarea
            defaultValue={exercise.notes ?? ''}
            placeholder="Cues / notes (optional)"
            rows={2}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              const next = v === '' ? null : v;
              if (next !== (exercise.notes ?? null)) onSaveField('notes', next);
            }}
            className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-surface-100 text-xs focus:outline-none focus:border-rainbow-cyan/50 resize-none"
          />
        </div>

        <div className="md:w-64 flex-shrink-0 space-y-2">
          {exercise.videoUrl ? (
            <>
              <video
                src={exercise.videoUrl}
                controls
                playsInline
                className="w-full rounded-md bg-black aspect-video object-contain"
              />
              <div className="flex gap-2">
                <UploadButton
                  label="Replace"
                  uploading={state.uploading}
                  progress={state.uploadProgress}
                  onFile={onUpload}
                />
                <button
                  onClick={onClearVideo}
                  className="text-xs text-surface-500 hover:text-red-400 transition-colors px-2"
                >
                  Remove
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="aspect-video w-full rounded-md bg-surface-800/50 border border-dashed border-surface-700 flex items-center justify-center text-xs text-surface-600">
                No video uploaded
              </div>
              <UploadButton
                label="Upload video"
                uploading={state.uploading}
                progress={state.uploadProgress}
                onFile={onUpload}
              />
            </div>
          )}

          <details className="text-xs">
            <summary className="text-surface-500 hover:text-surface-300 cursor-pointer">
              Or paste a URL
            </summary>
            <input
              defaultValue={exercise.videoUrl ?? ''}
              placeholder="https://..."
              onBlur={(e) => {
                const v = e.currentTarget.value.trim();
                const next = v === '' ? null : v;
                if (next !== (exercise.videoUrl ?? null)) onSaveField('videoUrl', next);
              }}
              className="w-full mt-2 bg-surface-800 border border-surface-700 rounded-md px-2 py-1.5 text-surface-100 focus:outline-none focus:border-rainbow-cyan/50"
            />
          </details>
        </div>
      </div>

      {state.error && <div className="mt-2 text-xs text-red-400">{state.error}</div>}
      {state.saving && <div className="mt-2 text-xs text-surface-500">Saving…</div>}
    </div>
  );
}

interface UploadButtonProps {
  label: string;
  uploading: boolean;
  progress: number;
  onFile: (file: File) => void;
}

function UploadButton({ label, uploading, progress, onFile }: UploadButtonProps) {
  return (
    <label className="block flex-1 cursor-pointer">
      <input
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) onFile(file);
          e.currentTarget.value = '';
        }}
      />
      <div
        className={`w-full text-center text-xs font-medium py-2 px-3 rounded-md border transition-colors ${
          uploading
            ? 'bg-surface-800 border-surface-700 text-surface-400 cursor-wait'
            : 'bg-rainbow-cyan/10 border-rainbow-cyan/40 text-rainbow-cyan hover:bg-rainbow-cyan/20'
        }`}
      >
        {uploading ? `Uploading… ${Math.round(progress)}%` : label}
      </div>
    </label>
  );
}
