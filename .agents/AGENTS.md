# Project Rules & Behavioral Guidelines - Hu-Mano Colombia

## Verification of Supabase Database Schemas and Assets
- **Mandatory Verification**: BEFORE writing or modifying any code that reads or writes a column, table, bucket, trigger, or function of Supabase, ALWAYS verify its real existence first.
- **Query / Confirmation Requirement**: Run or request confirmation queries (e.g., `information_schema.columns` for columns, `information_schema.tables` for tables, `storage.buckets` for buckets, `information_schema.routines` for functions/triggers).
- **No Assumptions**: NEVER assume that a table, column, bucket, or trigger exists simply because it is referenced in existing codebase files or past commit history — the codebase can be desynchronized from the live PostgreSQL database.
- **Halt and Report**: If a reference to an unconfirmed or non-existent column/table/bucket/function is detected, STOP immediately and report it to the user instead of proceeding under assumptions.
