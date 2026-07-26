import type { Request, Response } from "express";
import type { PatientDocument, DocumentCategory } from "@qyou/shared";

export class InMemoryDocumentRepository {
  private readonly documents: Map<string, PatientDocument> = new Map();
  private readonly accessPolicies: Map<string, { documentId: string; accessLevel: string; authorizedRoles: string[] }> = new Map();

  public async createDocument(doc: PatientDocument): Promise<PatientDocument> {
    this.documents.set(doc.id, doc);
    return doc;
  }

  public async listByPatient(patientId: string, clinicId: string): Promise<PatientDocument[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.patientId === patientId,
    );
  }

  public async findById(patientId: string, documentId: string): Promise<PatientDocument | null> {
    const doc = this.documents.get(documentId);
    if (!doc || doc.patientId !== patientId) return null;
    return doc;
  }

  public async deleteDocument(patientId: string, documentId: string): Promise<boolean> {
    const doc = this.documents.get(documentId);
    if (!doc || doc.patientId !== patientId) return false;
    this.documents.delete(documentId);
    return true;
  }

  public async setAccessControl(policy: { documentId: string; accessLevel: string; authorizedRoles: string[] }): Promise<{ documentId: string; accessLevel: string; authorizedRoles: string[] }> {
    this.accessPolicies.set(policy.documentId, policy);
    return policy;
  }

  public async getAccessControl(documentId: string): Promise<{ documentId: string; accessLevel: string; authorizedRoles: string[] } | null> {
    return this.accessPolicies.get(documentId) ?? null;
  }
}
