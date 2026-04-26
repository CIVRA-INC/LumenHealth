// Seed-based smoke scenarios for local QA

export interface SmokeScenario {
  name: string;
  endpoint: string;
  method: string;
  expectedStatus: number;
}

export const SMOKE_SCENARIOS: SmokeScenario[] = [
  {
    name: 'Auth Login',
    endpoint: '/auth/login',
    method: 'POST',
    expectedStatus: 200,
  },
  {
    name: 'Profile Fetch',
    endpoint: '/users/profile',
    method: 'GET',
    expectedStatus: 200,
  },
  {
    name: 'Artist List',
    endpoint: '/artists',
    method: 'GET',
    expectedStatus: 200,
  },
  {
    name: 'Session Create',
    endpoint: '/sessions',
    method: 'POST',
    expectedStatus: 201,
  },
  {
    name: 'Health Check',
    endpoint: '/health',
    method: 'GET',
    expectedStatus: 200,
  },
  {
    name: 'Auth Token Refresh',
    endpoint: '/auth/refresh',
    method: 'POST',
    expectedStatus: 200,
  },
];
