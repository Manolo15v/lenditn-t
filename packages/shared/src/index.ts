// Constants both sides of the wire must agree on. Not validation — that is
// server-side only, in @lendit/db/validation, so pg-core stays out of the
// browser bundle. This is the only package `web` may import at runtime, which
// makes it the home for things like the item category list in M3.

export {}
