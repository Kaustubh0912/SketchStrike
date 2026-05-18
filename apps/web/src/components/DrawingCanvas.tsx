'use client';

import { useEffect, useRef, useState } from 'react';
import { Layer, Line, Stage } from 'react-konva';
import type Konva from 'konva';
import type { DrawEvent } from '@sketchstrike/shared';
import { useGameStore } from '@/store/gameStore';
import { getSocket } from '@/lib/socket';
import Icon, { type IconName } from './Icon';

const PALETTE = [
  '#0a0a0a', '#ffffff', '#ff3366', '#ff8a00', '#ffd803',
  '#3ddc97', '#00c2ff', '#3b82f6', '#a855f7', '#ec4899',
  '#92400e', '#94a3b8',
];

const SIZES = [3, 6, 12, 22, 36];

interface Props {
  canDraw: boolean;
}

export default function DrawingCanvas({ canDraw }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [dims, setDims] = useState({ width: 800, height: 500 });
  const [color, setColor] = useState('#0a0a0a');
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState<'draw' | 'erase'>('draw');
  const [currentStroke, setCurrentStroke] = useState<number[] | null>(null);

  const events = useGameStore((s) => s.canvasReplay) ?? [];
  const clearKey = useGameStore((s) => s.canvasClearedAt);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width;
      setDims({ width: w, height: Math.round(w * 0.6) });
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setCurrentStroke(null);
  }, [clearKey]);

  const socket = getSocket();

  function pointerCoords(
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ): [number, number] | null {
    const stage = e.target.getStage();
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return [pos.x / dims.width, pos.y / dims.height];
  }

  function handleStart(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!canDraw) return;
    const c = pointerCoords(e);
    if (!c) return;
    setCurrentStroke([c[0], c[1]]);
  }

  function handleMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!canDraw || !currentStroke) return;
    const c = pointerCoords(e);
    if (!c) return;
    setCurrentStroke((prev) => (prev ? [...prev, c[0], c[1]] : [c[0], c[1]]));
  }

  function handleEnd() {
    if (!canDraw || !currentStroke) return;
    if (currentStroke.length >= 2) {
      const payload: DrawEvent = {
        type: tool,
        points: currentStroke,
        color: tool === 'erase' ? '#ffffff' : color,
        brushSize: size,
      };
      socket.emit('drawing_data', payload);
      const prev = useGameStore.getState().canvasReplay ?? [];
      useGameStore.getState().setCanvasReplay([...prev, payload]);
    }
    setCurrentStroke(null);
  }

  function clearCanvas() {
    socket.emit('clear_canvas');
  }
  function undo() {
    socket.emit('undo_canvas');
  }

  const previewPoints = currentStroke
    ? scalePoints(currentStroke, dims.width, dims.height)
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={wrapperRef}
        className="bx bg-white overflow-hidden touch-none relative"
      >
        <Stage
          ref={stageRef}
          width={dims.width}
          height={dims.height}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          style={{ cursor: canDraw ? 'crosshair' : 'default', touchAction: 'none' }}
        >
          <Layer listening={false}>
            {events.map((ev, i) => (
              <Line
                key={i}
                points={scalePoints(ev.points, dims.width, dims.height)}
                stroke={ev.type === 'erase' ? '#ffffff' : ev.color}
                strokeWidth={ev.brushSize}
                tension={0.3}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  ev.type === 'erase' ? 'destination-out' : 'source-over'
                }
              />
            ))}
            {previewPoints && (
              <Line
                points={previewPoints}
                stroke={tool === 'erase' ? '#ffffff' : color}
                strokeWidth={size}
                tension={0.3}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  tool === 'erase' ? 'destination-out' : 'source-over'
                }
              />
            )}
          </Layer>
        </Stage>
        {!canDraw && (
          <div className="absolute top-2 left-2 bx-sm bg-[var(--accent)] text-[var(--accent-fg)] px-2 py-1 text-xs font-bold uppercase flex items-center gap-1.5">
            <Icon name="eye" />
            Watching
          </div>
        )}
      </div>

      {canDraw && (
        <div className="bx-sm bg-[var(--paper)] p-2.5 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                aria-label={`color ${c}`}
                onClick={() => {
                  setColor(c);
                  setTool('draw');
                }}
                className={`w-8 h-8 rounded-md border-2 transition ${
                  color === c && tool === 'draw'
                    ? 'border-[var(--ink)] ring-2 ring-[var(--ink)] ring-offset-1 scale-110'
                    : 'border-[var(--ink)] hover:scale-110'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>

          <div className="h-8 w-[3px] bg-[var(--ink)] hidden sm:block" />

          <div className="flex items-center gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                aria-label={`size ${s}`}
                className={`w-9 h-9 grid place-items-center rounded-md border-2 border-[var(--ink)] transition ${
                  size === s ? 'bg-[var(--accent)]' : 'bg-[var(--paper)] hover:bg-[var(--bg-tile)]'
                }`}
              >
                <span
                  className="rounded-full bg-[var(--ink)] block"
                  style={{ width: Math.min(s, 20), height: Math.min(s, 20) }}
                />
              </button>
            ))}
          </div>

          <div className="h-8 w-[3px] bg-[var(--ink)] hidden sm:block" />

          <div className="flex items-center gap-1.5 ml-auto">
            <ToolBtn
              active={tool === 'erase'}
              onClick={() => setTool(tool === 'erase' ? 'draw' : 'erase')}
              label="Eraser"
              icon="eraser"
              tone="accent"
            />
            <ToolBtn onClick={undo} label="Undo" icon="undo" tone="ghost" />
            <ToolBtn onClick={clearCanvas} label="Clear" icon="trash" tone="danger" />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  label,
  icon,
  tone,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  icon: IconName;
  tone: 'accent' | 'ghost' | 'danger';
}) {
  const bg =
    tone === 'danger'
      ? 'bg-[var(--danger)] text-[var(--danger-fg)]'
      : tone === 'accent'
        ? active
          ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
          : 'bg-[var(--paper)] text-[var(--ink)]'
        : 'bg-[var(--paper)] text-[var(--ink)]';
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`bx-sm bx-press min-h-[40px] px-3 font-bold text-sm flex items-center gap-2 ${bg}`}
    >
      <Icon name={icon} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function scalePoints(normalized: number[], width: number, height: number): number[] {
  const out = new Array<number>(normalized.length);
  for (let i = 0; i < normalized.length; i += 2) {
    out[i] = (normalized[i] ?? 0) * width;
    out[i + 1] = (normalized[i + 1] ?? 0) * height;
  }
  return out;
}
