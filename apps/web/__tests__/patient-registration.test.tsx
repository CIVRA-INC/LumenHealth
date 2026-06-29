import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";

type FormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
};

type ValidationErrors = Partial<Record<keyof FormData, string>>;

const initialForm: FormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  phone: "",
  email: "",
};

function validateForm(data: FormData): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!data.firstName.trim()) errors.firstName = "First name is required";
  if (!data.lastName.trim()) errors.lastName = "Last name is required";
  if (!data.dateOfBirth.trim()) errors.dateOfBirth = "Date of birth is required";
  if (!data.phone.trim()) errors.phone = "Phone number is required";
  return errors;
}

function PatientRegistrationForm() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateForm(form);
    setErrors(validation);
    if (Object.keys(validation).length === 0) setSubmitted(true);
  }

  if (submitted) return <div data-testid="success-message">Patient registered</div>;

  return (
    <form onSubmit={handleSubmit} data-testid="patient-registration-form">
      {(["firstName", "lastName", "dateOfBirth", "phone", "email"] as const).map((field) => (
        <div key={field}>
          <label htmlFor={field}>{field}</label>
          <input
            id={field}
            name={field}
            type={field === "dateOfBirth" ? "date" : field === "email" ? "email" : "text"}
            value={form[field]}
            onChange={handleChange}
            data-testid={`input-${field}`}
          />
          {errors[field] && <span data-testid={`error-${field}`}>{errors[field]}</span>}
        </div>
      ))}
      <button type="submit" data-testid="submit-btn">Register</button>
    </form>
  );
}

function fillInput(id: string, value: string) {
  const input = screen.getByTestId(id);
  fireEvent.change(input, { target: { value } });
}

function getInputValue(id: string): string {
  return (screen.getByTestId(id) as HTMLInputElement).value;
}

const fixtures = {
  validPatient: {
    firstName: "Bob",
    lastName: "Okafor",
    dateOfBirth: "1985-08-22",
    phone: "+234-800-555-0101",
    email: "bob.okafor@example.com",
  },
};

describe("PatientRegistrationForm", () => {
  it("renders all input fields", () => {
    render(<PatientRegistrationForm />);
    expect(screen.getByTestId("input-firstName")).toBeInTheDocument();
    expect(screen.getByTestId("input-lastName")).toBeInTheDocument();
    expect(screen.getByTestId("input-dateOfBirth")).toBeInTheDocument();
    expect(screen.getByTestId("input-phone")).toBeInTheDocument();
    expect(screen.getByTestId("input-email")).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", () => {
    render(<PatientRegistrationForm />);
    fireEvent.click(screen.getByTestId("submit-btn"));
    expect(screen.getByTestId("error-firstName")).toHaveTextContent("First name is required");
    expect(screen.getByTestId("error-lastName")).toHaveTextContent("Last name is required");
  });

  it("updates field values on user input", () => {
    render(<PatientRegistrationForm />);
    fillInput("input-firstName", fixtures.validPatient.firstName);
    expect(getInputValue("input-firstName")).toBe(fixtures.validPatient.firstName);
  });

  it("submits successfully when all required fields are filled", () => {
    render(<PatientRegistrationForm />);
    fillInput("input-firstName", fixtures.validPatient.firstName);
    fillInput("input-lastName", fixtures.validPatient.lastName);
    fillInput("input-dateOfBirth", fixtures.validPatient.dateOfBirth);
    fillInput("input-phone", fixtures.validPatient.phone);
    fillInput("input-email", fixtures.validPatient.email);
    fireEvent.click(screen.getByTestId("submit-btn"));
    expect(screen.getByTestId("success-message")).toHaveTextContent("Patient registered");
  });

  it("clears firstName error when user starts typing", () => {
    render(<PatientRegistrationForm />);
    fireEvent.click(screen.getByTestId("submit-btn"));
    expect(screen.getByTestId("error-firstName")).toBeInTheDocument();
    fillInput("input-firstName", "C");
    expect(screen.queryByTestId("error-firstName")).not.toBeInTheDocument();
  });
});
