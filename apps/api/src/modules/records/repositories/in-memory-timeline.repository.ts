import type { ClinicalEventNode } from '@qyou/shared';

export class InMemoryTimelineRepository {
  private readonly nodes: Map<string, ClinicalEventNode[]> = new Map();

  public async saveNode(node: ClinicalEventNode): Promise<ClinicalEventNode> {
    const list = this.nodes.get(node.patientId) ?? [];
    list.push(node);
    this.nodes.set(node.patientId, list);
    return node;
  }

  public async getNodesByPatient(patientId: string): Promise<ClinicalEventNode[]> {
    return this.nodes.get(patientId) ?? [];
  }
}
