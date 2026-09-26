import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RolePolicyService } from '../role-policy/role-policy.service.js';
import type { Permission } from '@lumen/types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolePolicyService: RolePolicyService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<Permission[]>('permissions', context.getHandler());
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const role = req.auth?.role;
    if (!role) {
      throw new HttpException({ error: "AUTH_TOKEN_INVALID", message: "authentication required" }, HttpStatus.UNAUTHORIZED);
    }

    const policy = this.rolePolicyService.getRolePolicy(role);
    const hasPermission = requiredPermissions.every(permission => policy.permissions.includes(permission));
    
    if (!hasPermission) {
      const isStaffRoute = req.path.includes('/staff/');
      const message = isStaffRoute 
        ? (req.method === 'GET' ? "only owner or admin can list invitations" 
          : req.method === 'DELETE' ? "only owner or admin can revoke invitations" 
          : "only owner or admin can send invitations")
        : "insufficient permission";
        
      throw new HttpException({ error: "AUTH_FORBIDDEN", message }, HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
