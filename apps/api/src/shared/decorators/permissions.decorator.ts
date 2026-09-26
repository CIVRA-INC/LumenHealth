import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@lumen/types';

export const RequirePermissions = (...permissions: Permission[]) => SetMetadata('permissions', permissions);
