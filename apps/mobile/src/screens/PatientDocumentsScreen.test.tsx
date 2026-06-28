import React from 'react';
import { render } from '@testing-library/react-native';
import { PatientDocumentsScreen } from './PatientDocumentsScreen';

global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve([]) })
) as jest.Mock;

describe('PatientDocumentsScreen', () => {
  it('renders without crashing', () => {
    render(<PatientDocumentsScreen patientId="patient-1" />);
  });
  it('shows activity indicator initially', () => {
    const { UNSAFE_getByType } = render(<PatientDocumentsScreen patientId="p1" />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });
});
