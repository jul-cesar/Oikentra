import { defineTool } from "eve/tools";

import { businessApi, businessPath } from "../lib/api-client";
import { resolveOikentraContext } from "../lib/agent-context";

type Customer = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  notes?: string | null;
  status: string;
  totalDebt?: number;
  activeCredits?: number;
  oldDebt?: boolean;
  createdAt: string;
  updatedAt: string;
};

type FindCustomerOutput = {
  query: string;
  businessId: string;
  matchCount: number;
  ambiguous: boolean;
  matches: {
    id: string;
    name: string;
    phone: string | null;
    totalDebt: number;
    activeCredits: number;
    oldDebt: boolean;
    score: number;
  }[];
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function scoreCustomer(customer: Customer, query: string) {
  const normalizedName = normalize(customer.name);
  const normalizedPhone = normalize(customer.phone ?? "");
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) return 0;
  if (normalizedName === normalizedQuery) return 100;
  if (normalizedName.startsWith(normalizedQuery)) return 85;
  if (normalizedName.includes(normalizedQuery)) return 70;
  if (normalizedPhone.includes(normalizedQuery)) return 60;

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedTokens = queryTokens.filter((token) => normalizedName.includes(token));
  return matchedTokens.length ? Math.round((matchedTokens.length / queryTokens.length) * 50) : 0;
}

function readQuery(input: Record<string, unknown>) {
  const query = input.query;
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("query is required.");
  }
  return query.trim();
}

export default defineTool<FindCustomerOutput>({
  description: "Busca clientes del negocio activo por nombre o teléfono. Úsala antes de consultar deudas de un cliente.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["query"],
    properties: {
      query: {
        type: "string",
        minLength: 1,
        description: "Nombre, apodo o teléfono mencionado por el usuario.",
      },
    },
  },
  async execute(input, ctx): Promise<FindCustomerOutput> {
    const query = readQuery(input);
    const context = resolveOikentraContext(ctx);
    const customers = await businessApi<Customer[]>(context, businessPath(context, "/customers"), {
      signal: ctx.abortSignal,
    });

    const matches = customers
      .map((customer) => ({ customer, score: scoreCustomer(customer, query) }))
      .filter((candidate) => candidate.score > 0 && candidate.customer.status === "ACTIVE")
      .sort((a, b) => b.score - a.score || (b.customer.totalDebt ?? 0) - (a.customer.totalDebt ?? 0))
      .slice(0, 5)
      .map(({ customer, score }) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalDebt: customer.totalDebt ?? 0,
        activeCredits: customer.activeCredits ?? 0,
        oldDebt: customer.oldDebt ?? false,
        score,
      }));

    const topScore = matches[0]?.score ?? 0;
    const closeMatches = matches.filter((match) => topScore - match.score <= 15);

    return {
      query,
      businessId: context.businessId,
      matchCount: matches.length,
      ambiguous: closeMatches.length > 1,
      matches,
    };
  },
  toModelOutput(output) {
    return {
      type: "json",
      value: {
        matchCount: output.matchCount,
        ambiguous: output.ambiguous,
        matches: output.matches.map((match) => ({
          id: match.id,
          name: match.name,
          phone: match.phone,
          totalDebt: match.totalDebt,
          activeCredits: match.activeCredits,
          oldDebt: match.oldDebt,
        })),
      },
    };
  },
});
