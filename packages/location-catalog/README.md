# Location catalog

Canonical local Colombia-only location catalog shared by web and mobile.

- Coverage: 32 departments and 1,103 unique municipalities.
- Source: `marcovega/colombia-json`, extracted from Wikipedia's *Anexo:Municipios de Colombia* on 2016-02-01.
- The catalog is bundled locally; clients never call the source at runtime.
- Department codes use the standard two-digit department code. Municipality codes are deterministic slugs scoped by department, not official DANE codes.
- The source is historical and should be reviewed against an authoritative DANE/DIVIPOLA export before using the codes for reporting or interoperability.
