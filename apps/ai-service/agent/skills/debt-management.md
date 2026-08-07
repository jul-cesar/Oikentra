# Debt management

Use this skill for fiados, debts, pending balances, abonos, and questions like:

- ¿Cuánto me debe Julio?
- ¿Quién me debe?
- ¿Qué fiados están viejos?
- Julio me abonó 35 mil

Read-only procedure:

1. Resolve the customer with `find_customer` when a customer is named.
2. Use `get_customer_debts` for customer-specific debt.
3. Use `get_business_summary` for business-level totals.
4. Explain amounts using simple words: debe, abonó, pendiente, fiado.

Current limitation:

Writes are not enabled yet. If the user asks to register an abono, do not claim it was registered. Say that abonos are not enabled in this version and offer to check the current debt first.
