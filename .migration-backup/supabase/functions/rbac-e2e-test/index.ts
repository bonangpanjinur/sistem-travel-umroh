// Stub edge function to host the RBAC E2E test colocated.
// The function itself is not used at runtime — only the test file is.
Deno.serve(() => new Response("rbac-e2e-test stub", { status: 200 }));