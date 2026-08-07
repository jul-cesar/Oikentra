# Eve evals

Los evals son pruebas automáticas del comportamiento de Eve. No reemplazan probar en producción, pero guardan los casos importantes para repetirlos antes de cambiar prompts, tools o modelo.

## Suites actuales

### Smoke / safety

No dependen de datos del negocio.

```bash
pnpm --filter @oikentra/ai-service eval:smoke
pnpm --filter @oikentra/ai-service eval:safety
```

Cubren:

- saludo simple sin consultar datos
- rechazo de escrituras mientras el agente es read-only
- rechazo de código o temas fuera del negocio
- rechazo de prompt injection

Necesitan credenciales del modelo (`OPENAI_API_KEY`) porque ejecutan el agente real.

### Read-only con datos de negocio

Dependen de un negocio de prueba con datos conocidos.

```bash
pnpm --filter @oikentra/ai-service eval -- --tag requires-business-data
```

Cubren selección de tools para:

- deudas de cliente
- deudores principales
- movimientos de caja
- comparación de periodos

Todavía requieren un fixture/seed de negocio estable antes de usarse como gate.

## Cuándo correrlos

Corre `eval:smoke` antes de desplegar cambios en:

- `agent/instructions.md`
- `agent/tools/**`
- modelo configurado
- auth/canales Eve

Corre los evals con datos cuando exista staging/fixture estable.
