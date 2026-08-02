import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'test@example.com' })
  email!: string;

  @ApiProperty({ example: 'securepassword123' })
  password!: string;

  @ApiProperty({ example: 'My Clinic' })
  orgName!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'test@example.com' })
  email!: string;

  @ApiProperty({ example: 'securepassword123' })
  password!: string;
}
