"use client";
/**
 * CHORD-063 – Reusable form hook with validation state and async submission handling.
 * Provides field errors, loading state, and optimistic feedback.
 */

import { useState, useCallback } from "react";

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export interface FormState<T> {
  values: T;
  errors: FieldErrors<T>;
  isSubmitting: boolean;
  isSuccess: boolean;
  serverError: string | null;
}

export interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => FieldErrors<T>;
  onSubmit: (values: T) => Promise<void>;
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    isSubmitting: false,
    isSuccess: false,
    serverError: null,
  });

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setState((s) => ({
      ...s,
      values: { ...s.values, [key]: value },
      errors: { ...s.errors, [key]: undefined },
      isSuccess: false,
      serverError: null,
    }));
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const fieldErrors = validate ? validate(state.values) : {};
    if (Object.keys(fieldErrors).length > 0) {
      setState((s) => ({ ...s, errors: fieldErrors }));
      return;
    }
    setState((s) => ({ ...s, isSubmitting: true, serverError: null }));
    try {
      await onSubmit(state.values);
      setState((s) => ({ ...s, isSubmitting: false, isSuccess: true }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setState((s) => ({ ...s, isSubmitting: false, serverError: msg }));
    }
  }, [state.values, validate, onSubmit]);

  const reset = useCallback(() => {
    setState({ values: initialValues, errors: {}, isSubmitting: false, isSuccess: false, serverError: null });
  }, [initialValues]);

  return { ...state, setField, handleSubmit, reset };
}
