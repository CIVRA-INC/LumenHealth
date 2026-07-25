import type { DocumentAccessControl, DocumentStoragePolicy } from '@qyou/shared';

export class InMemoryDocumentRepository {
  private readonly accessPolicies: Map<string, DocumentAccessControl> = new Map();

  public async setAccessControl(policy: DocumentAccessControl): Promise<DocumentAccessControl> {
    this.accessPolicies.set(policy.documentId, policy);
    return policy;
  }

  public async getAccessControl(documentId: string): Promise<DocumentAccessControl | null> {
    return this.accessPolicies.get(documentId) ?? null;
  }
}
