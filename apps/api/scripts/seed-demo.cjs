const mongoose = require("mongoose");

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error("Missing MONGO_URI for demo seeding.");
  process.exit(1);
}

const clinicSchema = new mongoose.Schema({ name: String, location: String, contact: String }, { timestamps: true, versionKey: false });
const userSchema = new mongoose.Schema({ fullName: String, email: String, password: String, role: String, clinicId: String, isActive: Boolean }, { timestamps: true, versionKey: false });
const patientSchema = new mongoose.Schema({ systemId: String, firstName: String, lastName: String, dateOfBirth: Date, sex: String, contactNumber: String, address: String, isActive: Boolean, clinicId: String, searchName: String }, { timestamps: true, versionKey: false });
const encounterSchema = new mongoose.Schema({ patientId: String, providerId: String, clinicId: String, status: String, openedAt: Date, closedAt: Date }, { timestamps: true, versionKey: false });

const Clinic = mongoose.models.Clinic || mongoose.model("Clinic", clinicSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);
const Patient = mongoose.models.Patient || mongoose.model("Patient", patientSchema);
const Encounter = mongoose.models.Encounter || mongoose.model("Encounter", encounterSchema);

async function seed() {
  await mongoose.connect(mongoUri);

  const clinic = await Clinic.findOneAndUpdate(
    { name: "Lumen Demo Clinic" },
    { $setOnInsert: { name: "Lumen Demo Clinic", location: "Lagos", contact: "+2347000000000" } },
    { upsert: true, new: true }
  );

  const admin = await User.findOneAndUpdate(
    { email: "admin@demo.lumen" },
    {
      $setOnInsert: {
        fullName: "Demo Admin",
        email: "admin@demo.lumen",
        password: "$2b$10$0K7qJYx8v3Qd1Hj8D4xQ1uQ1eB3L5YQm1M2v4I4eR9b7zj3zN2M1C",
        role: "CLINIC_ADMIN",
        clinicId: String(clinic._id),
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );

  const rows = [
    ["LMN-DEMO-001", "Amina", "Kato", "1994-01-03T00:00:00.000Z", "F"],
    ["LMN-DEMO-002", "John", "Okello", "1988-07-11T00:00:00.000Z", "M"],
  ];

  for (const [systemId, firstName, lastName, dateOfBirth, sex] of rows) {
    const patient = await Patient.findOneAndUpdate(
      { systemId },
      {
        $setOnInsert: {
          systemId,
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          sex,
          contactNumber: "+2347000000000",
          address: "Demo Address",
          isActive: true,
          clinicId: String(clinic._id),
          searchName: `${firstName} ${lastName}`.toLowerCase(),
        },
      },
      { upsert: true, new: true }
    );

    await Encounter.findOneAndUpdate(
      { clinicId: String(clinic._id), patientId: String(patient._id), status: "OPEN" },
      {
        $setOnInsert: {
          patientId: String(patient._id),
          providerId: String(admin._id),
          clinicId: String(clinic._id),
          status: "OPEN",
          openedAt: new Date(),
          closedAt: null,
        },
      },
      { upsert: true, new: true }
    );
  }

  console.log("Demo clinic data seeded.");
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
