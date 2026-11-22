import { HttpException, HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';

export const staffValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  exceptionFactory: (errors: ValidationError[]) => {
    const error = errors[0];
    const constraints = error.constraints || {};
    const message = Object.values(constraints)[0] || 'invalid input';
    return new HttpException(
      {
        error: 'VALIDATION_FAILED',
        message,
        field: error.property,
      },
      HttpStatus.BAD_REQUEST,
    );
  },
});
