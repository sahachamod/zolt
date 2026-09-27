# @zolt/security

Auditable wrappers around Node cryptography: tenant-bound AES-256-GCM envelopes, HMAC-SHA-256, SHA-256/SHA-512 digests, and cryptographically secure random tokens. Weak or unauthenticated ciphers are intentionally not exposed.

Keys belong in a KMS, HSM, vault, or deployment secret store. `CRYPTO_MASTER_KEY` is suitable for local development only.
