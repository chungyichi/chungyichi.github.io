export interface Item { i: number; label: string; count: number; x: number; y: number; z: number; theta: number; r: number; rem: number; weight: number }
export interface Proj { x: number; y: number; scale: number; depth: number; opacity: number; z: number; live: boolean }
export interface State { yaw: number; pitch: number; vyaw: number; vpitch: number; target: number | null }
export interface Opts { perspective: number; minRem: number; maxRem: number; minWeight: number; maxWeight: number; spin: number; inertiaTau: number; restPitch: number; pitchEase: number; maxPitch: number; maxSpeed: number; dragRad: number; boxR: number; fitFrom: number; fitMin: number; nearDepth: number; fade: number; avoid: { w: number; h: number } | null }
export type StepOpts = Partial<Opts> & { reduced?: boolean };
export const TAU: number;
export const DEFAULTS: Opts;
export const CENTER_BOX: { w: number; h: number };
export const CENTER_Z: number;
export function maxIntrusion(items: Item[], o?: Opts): number;
export const REST: State;
export function boxOf(it: { label: string; rem: number; weight: number }): { w: number; h: number };
export function maxOverlap(items: Item[], o?: Opts): number;
export function wrapAngle(a: number): number;
export function sizeOf(count: number, min: number, max: number, o?: Opts, fit?: number): { rem: number; weight: number };
export function layoutWords(words: { label: string; count: number }[], o?: Opts): Item[];
export function project(it: Item, yaw: number, pitch: number, o?: Opts): Proj;
export function wordStyle(p: Proj): Record<string, string | number>;
export function dragRotate(s: { yaw: number; pitch: number }, dx: number, dy: number, o?: Opts): { yaw: number; pitch: number };
export function flickSpeed(v: number, d: number, dt: number, o?: Opts): number;
export function faceYaw(theta: number, from: number): number;
export function step(s: State, dt: number, opts?: StepOpts): State;
export function settled(s: State, opts?: StepOpts): boolean;
