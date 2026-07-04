import { z } from 'zod';

export const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:4200'),
  DATABASE_URL: z.string().min(1),
  KEYCLOAK_URL: z.string().url(),
  KEYCLOAK_REALM: z.string().min(1),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
});

export type AppConfig = z.infer<typeof configSchema>;

export function parseEnv(env: Record<string, unknown>): AppConfig {
  return configSchema.parse(env);
}
