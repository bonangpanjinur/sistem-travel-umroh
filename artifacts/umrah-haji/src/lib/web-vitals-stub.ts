// Stub for web-vitals — used when the real package is not installed.
// In production with real web-vitals installed, this file won't be used.
export type MetricType = { name: string; value: number; id: string; delta: number };
export const onLCP  = (_cb: (m: MetricType) => void) => {};
export const onCLS  = (_cb: (m: MetricType) => void) => {};
export const onINP  = (_cb: (m: MetricType) => void) => {};
export const onFCP  = (_cb: (m: MetricType) => void) => {};
export const onTTFB = (_cb: (m: MetricType) => void) => {};
