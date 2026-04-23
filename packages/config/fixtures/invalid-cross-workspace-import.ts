import { config } from '@lumen/config';
import { apiFetch } from '../../../apps/web/lib/api-client';

export const fixture = {
  apiBaseUrl: config.public.apiBaseUrl,
  apiFetch,
};
