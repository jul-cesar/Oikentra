# Customer resolution

Use this skill when the user mentions a customer by name, nickname, or phone.

Procedure:

1. Call `find_customer` with the user's text for the customer.
2. If there are no matches, say you did not find that customer in the active business.
3. If there is exactly one strong match, use that customer.
4. If `ambiguous` is true or several matches are plausible, ask the user which customer they mean.
5. Never choose silently if the result affects money, debt, sales, or future writes.

When asking for clarification, show short options with name, phone if present, and debt if relevant.
