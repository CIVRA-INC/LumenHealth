import React from 'react';

export const TEST_IDS = {
  SCREEN_CONTAINER: 'screen-container',
  HEADER: 'header',
  BACK_BUTTON: 'back-button',
  PRIMARY_BUTTON: 'primary-button',
  INPUT_FIELD: 'input-field',
  ERROR_MESSAGE: 'error-message',
  LOADING_INDICATOR: 'loading-indicator',
} as const;

export const mockNavigation = {
  navigate: jest.fn((screen: string, params?: Record<string, unknown>) => {
    console.log(`[mockNavigation] navigate -> ${screen}`, params ?? '');
  }),
  goBack: jest.fn(() => {
    console.log('[mockNavigation] goBack');
  }),
  push: jest.fn((screen: string, params?: Record<string, unknown>) => {
    console.log(`[mockNavigation] push -> ${screen}`, params ?? '');
  }),
};

export interface RenderScreenOptions {
  initialState?: Record<string, unknown>;
  navigationState?: Record<string, unknown>;
}

export function renderScreen(
  component: React.ReactElement,
  options: RenderScreenOptions = {},
): React.ReactElement {
  // Wrap with Provider and NavigationContainer stubs.
  // Replace with actual store/navigation provider as needed.
  console.log('[screen-test-setup] renderScreen called', options);
  return component;
}
