export type WorkspaceBoundary = {
  workspace: string;
  path: string;
  owner: string;
  runtime: 'backend' | 'frontend' | 'service' | 'shared';
  canImport: string[];
  description: string;
};

export const workspaceBoundaries: WorkspaceBoundary[] = [
  {
    workspace: '@lumen/api',
    path: 'apps/api',
    owner: 'backend-platform',
    runtime: 'backend',
    canImport: ['@lumen/config', '@lumen/types'],
    description: 'Express modular monolith for clinic, patient, workflow, billing, and AI routes.',
  },
  {
    workspace: '@lumen/web',
    path: 'apps/web',
    owner: 'web-platform',
    runtime: 'frontend',
    canImport: ['@lumen/config', '@lumen/types'],
    description: 'Next.js clinic dashboard and authenticated operator interface.',
  },
  {
    workspace: '@lumen/stellar',
    path: 'apps/stellar-service',
    owner: 'payments-platform',
    runtime: 'service',
    canImport: ['@lumen/config'],
    description: 'Isolated Stellar wallet, verification, and diagnostics service.',
  },
  {
    workspace: '@lumen/config',
    path: 'packages/config',
    owner: 'platform-foundation',
    runtime: 'shared',
    canImport: [],
    description: 'Shared configuration contracts, runtime flags, and boundary tooling.',
  },
  {
    workspace: '@lumen/types',
    path: 'packages/types',
    owner: 'platform-foundation',
    runtime: 'shared',
    canImport: [],
    description: 'Shared schemas and type contracts.',
  },
];

export const workspaceBoundaryMap = new Map(
  workspaceBoundaries.map((boundary) => [boundary.path, boundary]),
);

export const workspaceBoundarySummary = workspaceBoundaries.map((boundary) => ({
  workspace: boundary.workspace,
  path: boundary.path,
  runtime: boundary.runtime,
  owner: boundary.owner,
  canImport: boundary.canImport,
}));
