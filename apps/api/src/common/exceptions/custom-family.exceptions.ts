import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthFamilyException extends HttpException {
  constructor(message: string, statusCode: number = HttpStatus.UNAUTHORIZED) {
    super({ family: 'AUTH_ERROR', message }, statusCode);
  }
}

export class ClinicFamilyException extends HttpException {
  constructor(message: string, statusCode: number = HttpStatus.BAD_REQUEST) {
    super({ family: 'CLINIC_ERROR', message }, statusCode);
  }
}

export class AccountLockedException extends HttpException {
  constructor(message: string = 'Account locked due to multiple failed login attempts') {
    super({ family: 'ACCOUNT_LOCKED', message }, HttpStatus.LOCKED);
  }
}
