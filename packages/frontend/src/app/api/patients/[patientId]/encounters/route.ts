import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/db"; // Your TypeORM datasource helper
import { Encounter } from "@/lib/entities/Encounter";
import { Patient } from "@/lib/entities/Patient";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const ds = await getDataSource();
    const encounterRepo = ds.getRepository(Encounter);

    const encounters = await encounterRepo.find({
      where: { patient: { id: patientId } },
      order: { createdAt: "ASC" },
    });

    return NextResponse.json(encounters, { status: 200 });
  } catch (err) {
    console.error("Error fetching encounters:", err);
    return NextResponse.json({ error: "Failed to fetch encounters" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const body = await req.json();
    const ds = await getDataSource();

    const patientRepo = ds.getRepository(Patient);
    const encounterRepo = ds.getRepository(Encounter);

    const patient = await patientRepo.findOneBy({ id: patientId });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const encounter = encounterRepo.create({
      patient,
      bloodPressure: body.bloodPressure,
      heartRate: body.heartRate,
      temperature: body.temperature,
      respiratoryRate: body.respiratoryRate,
      subjective: body.subjective,
      objective: body.objective,
      assessment: body.assessment,
      plan: body.plan,
      createdAt: new Date(),
    });

    await encounterRepo.save(encounter);

    return NextResponse.json(encounter, { status: 201 });
  } catch (err) {
    console.error("Error creating encounter:", err);
    return NextResponse.json({ error: "Failed to create encounter" }, { status: 500 });
  }
}
