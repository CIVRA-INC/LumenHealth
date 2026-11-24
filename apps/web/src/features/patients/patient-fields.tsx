import { SEXES, SEX_LABELS, type CreatePatientInput } from '@lumen/contracts';
import { Button, FormField, FormSection, Select, TextField } from '@lumen/ui';
import { Plus } from 'lucide-react';
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';

interface Props {
  register: UseFormRegister<CreatePatientInput>;
  control: Control<CreatePatientInput>;
  errors: FieldErrors<CreatePatientInput>;
}

const empty = (v: string) => v || undefined;

/** Identity, contact, address and emergency-contact sections shared by registration and editing. */
export function PatientFields({ register, control, errors }: Props) {
  const contacts = useFieldArray({ control, name: 'emergencyContacts' });
  const contactErrors = errors.emergencyContacts;

  return (
    <>
      <FormSection title="Identity" description="As it appears on the patient’s identification.">
        <FormField label="First name" required span={2} error={errors.givenName?.message}>
          <TextField autoComplete="off" {...register('givenName')} />
        </FormField>
        <FormField label="Middle name" optional span={2} error={errors.middleName?.message}>
          <TextField autoComplete="off" {...register('middleName')} />
        </FormField>
        <FormField label="Last name" required span={2} error={errors.familyName?.message}>
          <TextField autoComplete="off" {...register('familyName')} />
        </FormField>
        <FormField label="Date of birth" required span={3} error={errors.dateOfBirth?.message}>
          <TextField type="date" {...register('dateOfBirth')} />
        </FormField>
        <FormField label="Sex" required span={3} error={errors.sex?.message}>
          <Select {...register('sex')}>
            <option value="">Select</option>
            {SEXES.map((s) => (
              <option key={s} value={s}>
                {SEX_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormField>
      </FormSection>

      <FormSection title="Contact" description="How we reach the patient about appointments.">
        <FormField
          label="Phone number"
          required
          description="Nigerian numbers can be typed as 0803…"
          error={errors.phone?.message}
        >
          <TextField type="tel" autoComplete="off" {...register('phone')} />
        </FormField>
        <FormField label="Email" optional error={errors.email?.message}>
          <TextField
            type="email"
            autoComplete="off"
            {...register('email', { setValueAs: empty })}
          />
        </FormField>
      </FormSection>

      <FormSection title="Address">
        <FormField label="Street address" optional span={6} error={errors.address?.line1?.message}>
          <TextField autoComplete="off" {...register('address.line1', { setValueAs: empty })} />
        </FormField>
        <FormField label="City" optional error={errors.address?.city?.message}>
          <TextField autoComplete="off" {...register('address.city', { setValueAs: empty })} />
        </FormField>
        <FormField label="State" optional error={errors.address?.state?.message}>
          <TextField autoComplete="off" {...register('address.state', { setValueAs: empty })} />
        </FormField>
      </FormSection>

      <FormSection
        title="Emergency contact"
        description="Someone to call if the patient cannot be reached."
      >
        {contacts.fields.length === 0 && (
          <p data-span="6" className="text-sm text-ink-500 sm:col-span-6">
            No emergency contact added.
          </p>
        )}
        {contacts.fields.map((field, index) => (
          <fieldset
            key={field.id}
            data-span="6"
            className="grid grid-cols-1 gap-x-5 gap-y-4 border-b border-rule-soft pb-4 last:border-b-0 sm:col-span-6 sm:grid-cols-6"
          >
            <legend className="sr-only">Emergency contact {index + 1}</legend>
            <FormField
              label="Full name"
              required
              span={2}
              error={contactErrors?.[index]?.name?.message}
            >
              <TextField autoComplete="off" {...register(`emergencyContacts.${index}.name`)} />
            </FormField>
            <FormField
              label="Relationship"
              required
              span={2}
              error={contactErrors?.[index]?.relationship?.message}
            >
              <TextField
                autoComplete="off"
                {...register(`emergencyContacts.${index}.relationship`)}
              />
            </FormField>
            <FormField
              label="Phone number"
              required
              span={2}
              error={contactErrors?.[index]?.phone?.message}
            >
              <TextField
                type="tel"
                autoComplete="off"
                {...register(`emergencyContacts.${index}.phone`)}
              />
            </FormField>
            <div data-span="6" className="sm:col-span-6">
              <Button variant="destructive-quiet" size="sm" onClick={() => contacts.remove(index)}>
                Remove contact {index + 1}
              </Button>
            </div>
          </fieldset>
        ))}
        {contacts.fields.length < 3 && (
          <div data-span="6" className="sm:col-span-6">
            <Button
              size="sm"
              onClick={() => contacts.append({ name: '', relationship: '', phone: '' })}
            >
              <Plus /> {contacts.fields.length === 0 ? 'Add emergency contact' : 'Add another'}
            </Button>
          </div>
        )}
      </FormSection>
    </>
  );
}
