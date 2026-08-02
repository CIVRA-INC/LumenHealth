import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CLIENT } from '../db/db.provider';
import { facilities, orgs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { CreateFacilityDto } from './dto/create-facility.dto';

@Injectable()
export class FacilitiesService {
  constructor(@Inject(DB_CLIENT) private readonly db: any) {}

  async create(orgId: string, dto: CreateFacilityDto) {
    // Validate org exists
    const orgRes = await this.db.select().from(orgs).where(eq(orgs.id, orgId));
    if (!orgRes.length) {
      throw new NotFoundException('Organization not found');
    }

    const [newFacility] = await this.db
      .insert(facilities)
      .values({
        orgId,
        name: dto.name,
      })
      .returning();

    return newFacility;
  }

  async findAll(orgId: string) {
    return this.db.select().from(facilities).where(eq(facilities.orgId, orgId));
  }
}
