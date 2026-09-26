import { Module } from '@nestjs/common';
import { _resetAuthStateForTests } from '../controllers/auth.controller.js';

@Module({
  providers: [
    {
      provide: 'AUTH_TESTING_RESET',
      useValue: () => {
        _resetAuthStateForTests();
      }
    }
  ],
  exports: ['AUTH_TESTING_RESET'],
})
export class AuthTestingModule {
  static reset(): void {
    _resetAuthStateForTests();
  }
}
