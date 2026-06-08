---
name: Supabase null vs undefined in TypeScript interfaces
description: Supabase always returns null for nullable columns, but local interfaces often use optional (undefined) fields — causes TS2769 overload mismatch.
---

## Rule
When a local TypeScript interface uses `field?: string` (i.e. `string | undefined`) but Supabase returns `field: string | null`, TypeScript will error with "Type 'null' is not assignable to type 'string | undefined'".

## Fix pattern
Map null → undefined inside the `queryFn` before returning:

```ts
return (data ?? []).map((e) => ({
  ...e,
  position: e.position ?? undefined,
  department: e.department ?? undefined,
}));
```

**Why:** Supabase PostgREST always serialises missing values as JSON `null`. TS strict mode treats `null` and `undefined` as distinct. The spread + nullish coalescing bridges the gap without changing the interface.

**How to apply:** Any time `useQuery<MyType[]>` errors with "null not assignable to undefined" on a Supabase queryFn, add the map transform for every nullable column that the local interface marks as optional.
