# Environment and service configuration

Generated `.env.example` files document every supported setting; `.env` remains ignored. The default tenant is `default`. Change it with `DEFAULT_TENANT_ID`, but never use a tenant ID alone as authorization evidence.

Storage configuration supports `none`, `local`, `s3`, `gcs`, and `azure`. Email configuration supports `none`, `smtp`, `ses`, `sendgrid`, and `mailgun`. `@zolt/config` validates the selected provider and required non-secret values. Provider SDK clients are not bundled yet, so validation does not imply that an upload or email was sent.

```bash
zolt env:init
zolt env:check
```

`env:init` creates local-only random secrets. In production, inject secrets from the platform's secret manager and use managed encryption keys where available.
