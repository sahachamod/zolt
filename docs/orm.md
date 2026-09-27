# ORM

Zolt 0.1 does not publish a schema/entity ORM. `@zolt/database` (see [database](database.md)) gives you a real, unified connection and query interface across postgres, mysql, sqlite, and mongodb — `query()`/`execute()` for SQL drivers, `database()` for mongodb — but no migrations, schema definitions, or model layer.

Applications may choose a full ORM (Drizzle, Prisma, Kysely, Mongoose, etc.) directly on top of the same `DATABASE_URL` while the framework's own schema/migration story is designed.
