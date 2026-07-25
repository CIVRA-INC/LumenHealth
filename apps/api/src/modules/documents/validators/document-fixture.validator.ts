import {
  apiDocumentFixtureSchema,
  type ApiDocumentFixtureInput,
} from '@qyou/shared';

export function validateApiDocumentFixture(data: unknown) {
  return apiDocumentFixtureSchema.safeParse(data);
}
