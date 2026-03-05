import mongoose from "mongoose";
import { config } from "@lumen/config";
import { Icd10CodeModel } from "../apps/api/src/modules/diagnoses/models/icd10-code.model";

type Icd10SeedRow = {
  code: string;
  description: string;
  searchText: string;
};

const MAJOR_GROUPS = [
  "Infectious disease",
  "Respiratory condition",
  "Gastrointestinal disorder",
  "Hypertensive disease",
  "Endocrine disorder",
  "Musculoskeletal condition",
  "Skin condition",
  "Genitourinary condition",
  "Neurologic disorder",
  "General symptom",
] as const;

export const buildIcd10LiteDataset = (size = 1000): Icd10SeedRow[] => {
  const rows: Icd10SeedRow[] = [];

  for (let i = 0; i < size; i += 1) {
    const letter = String.fromCharCode(65 + (i % 26));
    const major = Math.floor(i / 10) % 100;
    const minor = i % 10;
    const code = `${letter}${major.toString().padStart(2, "0")}.${minor}`;
    const group = MAJOR_GROUPS[i % MAJOR_GROUPS.length];
    const description = `${group} variant ${i + 1}`;

    rows.push({
      code,
      description,
      searchText: `${code} ${description}`.toLowerCase(),
    });
  }

  return rows;
};

export const upsertIcd10Lite = async (rows: Icd10SeedRow[]) => {
  const operations = rows.map((row) => ({
    updateOne: {
      filter: { code: row.code },
      update: {
        $set: {
          description: row.description,
          searchText: row.searchText,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length === 0) {
    return { upsertedCount: 0, modifiedCount: 0 };
  }

  const result = await Icd10CodeModel.bulkWrite(operations, { ordered: false });

  return {
    upsertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount,
  };
};

const run = async () => {
  const uri = config.mongoUri;
  if (!uri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(uri);

  const rows = buildIcd10LiteDataset(1000);
  const result = await upsertIcd10Lite(rows);

  console.log("seed-icd10-lite completed", {
    total: rows.length,
    upserted: result.upsertedCount,
    modified: result.modifiedCount,
  });

  await mongoose.disconnect();
};

if (require.main === module) {
  void run().catch(async (error) => {
    console.error("seed-icd10-lite failed", error);
    await mongoose.disconnect();
    process.exit(1);
  });
}
