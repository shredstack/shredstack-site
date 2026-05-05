'use client';

import Link from 'next/link';
import { useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  CATEGORY_HINT,
  CATEGORY_LABELS,
  isDailyCategory,
  type ExerciseWithRelations,
  type ExerciseVideoEntry,
  type MobilityCategory,
  type MobilityDay,
} from '@/lib/mobility/program';

interface Props {
  initialExercises: ExerciseWithRelations[];
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
  const [exercises, setExercises] = useState<ExerciseWithRelations[]>(initialExercises);
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

  function patchExercise(id: number, patch: Partial<ExerciseWithRelations>) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)),
    );
  }

  async function refreshExerciseVideos(id: number) {
    try {
      const res = await fetch('/api/mobility/exercises');
      if (!res.ok) return;
      const data = (await res.json()) as { exercises: ExerciseWithRelations[] };
      const fresh = data.exercises.find((e) => e.id === id);
      if (fresh) patchExercise(id, { videos: fresh.videos });
    } catch (err) {
      console.error('Failed to refresh videos', err);
    }
  }

  async function saveTextField(
    id: number,
    field: 'name' | 'setsReps' | 'notes',
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

  async function saveDays(id: number, days: number[]) {
    updateRowState(id, { saving: true, error: null });
    try {
      const res = await fetch(`/api/mobility/exercises/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Save failed');
      }
      const data = (await res.json()) as {
        days: number[];
        orderByDay: Record<number, number>;
      };
      patchExercise(id, { days: data.days, orderByDay: data.orderByDay });
      updateRowState(id, { saving: false });
    } catch (err) {
      updateRowState(id, {
        saving: false,
        error: err instanceof Error ? err.message : 'Save failed',
      });
    }
  }

  async function toggleDay(ex: ExerciseWithRelations, day: MobilityDay) {
    const next = ex.days.includes(day)
      ? ex.days.filter((d) => d !== day)
      : [...ex.days, day].sort((a, b) => a - b);
    if (next.length === 0) {
      setGlobalError('An exercise must be assigned to at least one day.');
      return;
    }
    await saveDays(ex.id, next);
  }

  async function handleVideoFile(id: number, file: File) {
    updateRowState(id, { uploading: true, uploadProgress: 0, error: null });
    try {
      await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/mobility/upload-url',
        clientPayload: JSON.stringify({ exerciseId: id }),
        onUploadProgress: (p) => updateRowState(id, { uploadProgress: p.percentage }),
      });
      // The server's onUploadCompleted has inserted the video row. Refresh
      // this exercise's videos to pick up the new id.
      await refreshExerciseVideos(id);
      updateRowState(id, { uploading: false, uploadProgress: 100 });
    } catch (err) {
      updateRowState(id, {
        uploading: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }

  async function deleteVideo(exerciseId: number, videoId: number) {
    if (!window.confirm('Remove this video link from the exercise? (The blob file is not deleted.)')) {
      return;
    }
    try {
      const res = await fetch(
        `/api/mobility/exercises/${exerciseId}/videos/${videoId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Delete failed');
      }
      patchExercise(exerciseId, {
        videos: (exercises.find((e) => e.id === exerciseId)?.videos ?? []).filter(
          (v) => v.id !== videoId,
        ),
      });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function saveVideoLabel(
    exerciseId: number,
    videoId: number,
    label: string | null,
  ) {
    try {
      const res = await fetch(
        `/api/mobility/exercises/${exerciseId}/videos/${videoId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Save failed');
      }
      const ex = exercises.find((e) => e.id === exerciseId);
      if (ex) {
        patchExercise(exerciseId, {
          videos: ex.videos.map((v) =>
            v.id === videoId ? { ...v, label } : v,
          ),
        });
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function handleAdd(category: MobilityCategory, day: MobilityDay | null) {
    const key = sectionKey(category, day);
    setCreatingFor(key);
    setGlobalError(null);
    try {
      const body: Record<string, unknown> = { category };
      if (!isDailyCategory(category)) {
        if (day === null) throw new Error('day required for exercise items');
        body.days = [day];
      }
      const res = await fetch('/api/mobility/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  async function handleDelete(ex: ExerciseWithRelations) {
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
          {DAYS.map((day) => {
            const items = exercises.filter(
              (ex) => ex.category === 'exercise' && ex.days.includes(day),
            );
            return (
              <Section
                key={`day-${day}`}
                title={`Day ${day} — Exercises`}
                hint="Tip: assign one exercise to multiple days using the day badges below."
                category="exercise"
                day={day}
                creatingKey={creatingFor}
                addLabel="+ Add exercise"
                items={items}
                sortBy={(a, b) => {
                  const ao = a.orderByDay[day] ?? Number.MAX_SAFE_INTEGER;
                  const bo = b.orderByDay[day] ?? Number.MAX_SAFE_INTEGER;
                  if (ao !== bo) return ao - bo;
                  return a.id - b.id;
                }}
                onAdd={handleAdd}
                onDelete={handleDelete}
                onSaveTextField={(id, field, value) => {
                  patchExercise(id, { [field]: value } as Partial<ExerciseWithRelations>);
                  saveTextField(id, field, value);
                }}
                onToggleDay={toggleDay}
                onUpload={handleVideoFile}
                onDeleteVideo={deleteVideo}
                onSaveVideoLabel={saveVideoLabel}
                getRowState={getRowState}
              />
            );
          })}

          <Section
            title="Stretches"
            hint={CATEGORY_HINT.stretch}
            category="stretch"
            day={null}
            creatingKey={creatingFor}
            addLabel="+ Add stretch"
            items={exercises.filter((ex) => ex.category === 'stretch')}
            sortBy={(a, b) => a.orderInDay - b.orderInDay || a.id - b.id}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onSaveTextField={(id, field, value) => {
              patchExercise(id, { [field]: value } as Partial<ExerciseWithRelations>);
              saveTextField(id, field, value);
            }}
            onToggleDay={toggleDay}
            onUpload={handleVideoFile}
            onDeleteVideo={deleteVideo}
            onSaveVideoLabel={saveVideoLabel}
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
            sortBy={(a, b) => a.orderInDay - b.orderInDay || a.id - b.id}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onSaveTextField={(id, field, value) => {
              patchExercise(id, { [field]: value } as Partial<ExerciseWithRelations>);
              saveTextField(id, field, value);
            }}
            onToggleDay={toggleDay}
            onUpload={handleVideoFile}
            onDeleteVideo={deleteVideo}
            onSaveVideoLabel={saveVideoLabel}
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
  items: ExerciseWithRelations[];
  sortBy: (a: ExerciseWithRelations, b: ExerciseWithRelations) => number;
  onAdd: (category: MobilityCategory, day: MobilityDay | null) => void;
  onDelete: (ex: ExerciseWithRelations) => void;
  onSaveTextField: (
    id: number,
    field: 'name' | 'setsReps' | 'notes',
    value: string | null,
  ) => void;
  onToggleDay: (ex: ExerciseWithRelations, day: MobilityDay) => void;
  onUpload: (id: number, file: File) => void;
  onDeleteVideo: (exerciseId: number, videoId: number) => void;
  onSaveVideoLabel: (exerciseId: number, videoId: number, label: string | null) => void;
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
  sortBy,
  onAdd,
  onDelete,
  onSaveTextField,
  onToggleDay,
  onUpload,
  onDeleteVideo,
  onSaveVideoLabel,
  getRowState,
}: SectionProps) {
  const isCreating = creatingKey === sectionKey(category, day);
  const sortedItems = [...items].sort(sortBy);

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
              currentDay={day}
              state={getRowState(ex.id)}
              onSaveTextField={(field, value) => onSaveTextField(ex.id, field, value)}
              onToggleDay={(d) => onToggleDay(ex, d)}
              onUpload={(file) => onUpload(ex.id, file)}
              onDeleteVideo={(videoId) => onDeleteVideo(ex.id, videoId)}
              onSaveVideoLabel={(videoId, label) => onSaveVideoLabel(ex.id, videoId, label)}
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
  exercise: ExerciseWithRelations;
  currentDay: MobilityDay | null;
  state: RowState;
  onSaveTextField: (field: 'name' | 'setsReps' | 'notes', value: string | null) => void;
  onToggleDay: (day: MobilityDay) => void;
  onUpload: (file: File) => void;
  onDeleteVideo: (videoId: number) => void;
  onSaveVideoLabel: (videoId: number, label: string | null) => void;
  onDelete: () => void;
}

function ExerciseRow({
  exercise,
  currentDay,
  state,
  onSaveTextField,
  onToggleDay,
  onUpload,
  onDeleteVideo,
  onSaveVideoLabel,
  onDelete,
}: ExerciseRowProps) {
  const cat = exercise.category as MobilityCategory;
  const showSetsReps = cat === 'exercise';
  const isRotational = cat === 'exercise';
  const orderLabel = isRotational
    ? currentDay
      ? exercise.orderByDay[currentDay] ?? '?'
      : '?'
    : exercise.orderInDay;

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-surface-500">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-surface-800 border border-surface-700">
                #{orderLabel}
              </span>
              <span>{CATEGORY_LABELS[cat] ?? exercise.category}</span>
              {!isRotational && (
                <span className="text-rainbow-teal">· daily</span>
              )}
              {isRotational && (
                <div className="flex items-center gap-1">
                  {DAYS.map((d) => {
                    const on = exercise.days.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => onToggleDay(d)}
                        title={on ? `Remove from Day ${d}` : `Add to Day ${d}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                          on
                            ? 'bg-rainbow-cyan/15 border-rainbow-cyan/50 text-rainbow-cyan'
                            : 'bg-surface-800 border-surface-700 text-surface-500 hover:border-surface-600'
                        }`}
                      >
                        D{d}
                      </button>
                    );
                  })}
                </div>
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
              if (v && v !== exercise.name) onSaveTextField('name', v);
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
                if (next !== (exercise.setsReps ?? null)) onSaveTextField('setsReps', next);
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
              if (next !== (exercise.notes ?? null)) onSaveTextField('notes', next);
            }}
            className="w-full bg-surface-800 border border-surface-700 rounded-md px-3 py-2 text-surface-100 text-xs focus:outline-none focus:border-rainbow-cyan/50 resize-none"
          />
        </div>

        <div className="md:w-72 flex-shrink-0 space-y-3">
          {exercise.videos.length === 0 ? (
            <div className="space-y-2">
              <div className="aspect-video w-full rounded-md bg-surface-800/50 border border-dashed border-surface-700 flex items-center justify-center text-xs text-surface-600">
                No videos uploaded
              </div>
              <UploadButton
                label="Upload video"
                uploading={state.uploading}
                progress={state.uploadProgress}
                onFile={onUpload}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {exercise.videos.map((v, idx) => (
                <VideoRow
                  key={v.id}
                  index={idx}
                  video={v}
                  onDelete={() => onDeleteVideo(v.id)}
                  onSaveLabel={(label) => onSaveVideoLabel(v.id, label)}
                />
              ))}
              <UploadButton
                label="+ Add another video"
                uploading={state.uploading}
                progress={state.uploadProgress}
                onFile={onUpload}
              />
            </div>
          )}
        </div>
      </div>

      {state.error && <div className="mt-2 text-xs text-red-400">{state.error}</div>}
      {state.saving && <div className="mt-2 text-xs text-surface-500">Saving…</div>}
    </div>
  );
}

interface VideoRowProps {
  index: number;
  video: ExerciseVideoEntry;
  onDelete: () => void;
  onSaveLabel: (label: string | null) => void;
}

function VideoRow({ index, video, onDelete, onSaveLabel }: VideoRowProps) {
  return (
    <div className="space-y-1.5">
      <video
        src={video.url}
        controls
        playsInline
        className="w-full rounded-md bg-black aspect-video object-contain"
      />
      <div className="flex items-center gap-2">
        <input
          defaultValue={video.label ?? ''}
          placeholder={`Video ${index + 1} label (optional)`}
          onBlur={(e) => {
            const v = e.currentTarget.value.trim();
            const next = v === '' ? null : v;
            if (next !== (video.label ?? null)) onSaveLabel(next);
          }}
          className="flex-1 bg-surface-800 border border-surface-700 rounded-md px-2 py-1.5 text-surface-100 text-xs focus:outline-none focus:border-rainbow-cyan/50"
        />
        <button
          onClick={onDelete}
          className="text-xs text-surface-500 hover:text-red-400 transition-colors px-2 py-1.5"
          title="Remove video"
        >
          ✕
        </button>
      </div>
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
