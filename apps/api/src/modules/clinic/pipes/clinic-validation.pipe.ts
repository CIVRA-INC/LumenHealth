import { ValidationPipe, ValidationError, HttpException, HttpStatus } from '@nestjs/common';

export const clinicValidationPipe = new ValidationPipe({
  exceptionFactory: (errors: ValidationError[]) => {
    const error = errors[0];
    const constraints = error.constraints || {};
    const message = Object.values(constraints)[0] || 'invalid input';
    return new HttpException({
      error: "CLINIC_INVALID_INPUT",
      message: message,
      field: error.property,
    }, HttpStatus.BAD_REQUEST);
  },
  whitelist: true,
});
