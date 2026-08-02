import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CLIENT } from '../db/db.provider';
import { devices, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class DevicesService {
  constructor(@Inject(DB_CLIENT) private readonly db: any) {}

  async registerDevice(userId: string, deviceId: string, name: string) {
    const [newDevice] = await this.db
      .insert(devices)
      .values({
        userId,
        deviceId,
        name,
      })
      .returning();
    return newDevice;
  }

  async getMyDevices(userId: string) {
    return this.db.select().from(devices).where(eq(devices.userId, userId));
  }

  async revokeDevice(userId: string, deviceId: string) {
    const result = await this.db
      .update(devices)
      .set({ isRevoked: true })
      .where(and(eq(devices.userId, userId), eq(devices.deviceId, deviceId)))
      .returning();

    if (!result.length) {
      throw new NotFoundException('Device not found or not owned by user');
    }
    return result[0];
  }
}
