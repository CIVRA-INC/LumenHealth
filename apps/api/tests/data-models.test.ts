import { describe, expect, it } from 'vitest';
import { Schema, Types } from 'mongoose';

// ── CHORD-033: ArtistProfile ───────────────────────────────────────────────────
describe('ArtistProfile model (CHORD-033)', () => {
  it('exports ArtistProfileModel with correct collection name', async () => {
    const { ArtistProfileModel } = await import(
      '../src/modules/artists/models/artist-profile.model'
    );
    expect(ArtistProfileModel.modelName).toBe('ArtistProfile');
  });

  it('schema has required userId and displayName fields', async () => {
    const { ArtistProfileModel } = await import(
      '../src/modules/artists/models/artist-profile.model'
    );
    const schema = ArtistProfileModel.schema;
    expect(schema.path('userId')).toBeDefined();
    expect(schema.path('displayName')).toBeDefined();
  });

  it('verificationStatus defaults to unverified', async () => {
    const { ArtistProfileModel } = await import(
      '../src/modules/artists/models/artist-profile.model'
    );
    const doc = new ArtistProfileModel({
      userId: new Types.ObjectId(),
      displayName: 'Test Artist',
    });
    expect(doc.verificationStatus).toBe('unverified');
  });

  it('payoutStatus defaults to not_ready', async () => {
    const { ArtistProfileModel } = await import(
      '../src/modules/artists/models/artist-profile.model'
    );
    const doc = new ArtistProfileModel({
      userId: new Types.ObjectId(),
      displayName: 'Test Artist',
    });
    expect(doc.payoutStatus).toBe('not_ready');
  });

  it('genres defaults to empty array', async () => {
    const { ArtistProfileModel } = await import(
      '../src/modules/artists/models/artist-profile.model'
    );
    const doc = new ArtistProfileModel({
      userId: new Types.ObjectId(),
      displayName: 'Test Artist',
    });
    expect(doc.genres).toEqual([]);
  });

  it('has compound indexes for discoverability and payout', async () => {
    const { ArtistProfileModel } = await import(
      '../src/modules/artists/models/artist-profile.model'
    );
    const indexes = ArtistProfileModel.schema.indexes();
    const keys = indexes.map(([key]) => JSON.stringify(key));
    expect(keys.some((k) => k.includes('genres'))).toBe(true);
    expect(keys.some((k) => k.includes('payoutStatus'))).toBe(true);
  });
});

// ── CHORD-034: Session ─────────────────────────────────────────────────────────
describe('Session model (CHORD-034)', () => {
  it('exports SessionModel with correct collection name', async () => {
    const { SessionModel } = await import(
      '../src/modules/sessions/models/session.model'
    );
    expect(SessionModel.modelName).toBe('Session');
  });

  it('status defaults to draft', async () => {
    const { SessionModel } = await import(
      '../src/modules/sessions/models/session.model'
    );
    const doc = new SessionModel({
      artistId: new Types.ObjectId(),
      title: 'My First Stream',
    });
    expect(doc.status).toBe('draft');
  });

  it('viewerCount defaults to 0', async () => {
    const { SessionModel } = await import(
      '../src/modules/sessions/models/session.model'
    );
    const doc = new SessionModel({
      artistId: new Types.ObjectId(),
      title: 'My First Stream',
    });
    expect(doc.viewerCount).toBe(0);
  });

  it('totalTipsXlm defaults to "0"', async () => {
    const { SessionModel } = await import(
      '../src/modules/sessions/models/session.model'
    );
    const doc = new SessionModel({
      artistId: new Types.ObjectId(),
      title: 'My First Stream',
    });
    expect(doc.totalTipsXlm).toBe('0');
  });

  it('rejects invalid status values', async () => {
    const { SessionModel } = await import(
      '../src/modules/sessions/models/session.model'
    );
    const doc = new SessionModel({
      artistId: new Types.ObjectId(),
      title: 'Bad Status',
      status: 'unknown',
    });
    const err = doc.validateSync();
    expect(err?.errors['status']).toBeDefined();
  });

  it('has compound indexes for live feed and scheduled feed', async () => {
    const { SessionModel } = await import(
      '../src/modules/sessions/models/session.model'
    );
    const indexes = SessionModel.schema.indexes();
    const keys = indexes.map(([key]) => JSON.stringify(key));
    expect(keys.some((k) => k.includes('startedAt'))).toBe(true);
    expect(keys.some((k) => k.includes('scheduledAt'))).toBe(true);
  });
});

// ── CHORD-035: TipIntent + TipTransaction ─────────────────────────────────────
describe('TipIntent model (CHORD-035)', () => {
  it('exports TipIntentModel with correct collection name', async () => {
    const { TipIntentModel } = await import(
      '../src/modules/tips/models/tip.model'
    );
    expect(TipIntentModel.modelName).toBe('TipIntent');
  });

  it('status defaults to pending', async () => {
    const { TipIntentModel } = await import(
      '../src/modules/tips/models/tip.model'
    );
    const doc = new TipIntentModel({
      fanId: new Types.ObjectId(),
      artistId: new Types.ObjectId(),
      sessionId: new Types.ObjectId(),
      amountXlm: '10',
      idempotencyKey: 'key-001',
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(doc.status).toBe('pending');
  });

  it('requires idempotencyKey', async () => {
    const { TipIntentModel } = await import(
      '../src/modules/tips/models/tip.model'
    );
    const doc = new TipIntentModel({
      fanId: new Types.ObjectId(),
      artistId: new Types.ObjectId(),
      sessionId: new Types.ObjectId(),
      amountXlm: '10',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const err = doc.validateSync();
    expect(err?.errors['idempotencyKey']).toBeDefined();
  });
});

describe('TipTransaction model (CHORD-035)', () => {
  it('exports TipTransactionModel with correct collection name', async () => {
    const { TipTransactionModel } = await import(
      '../src/modules/tips/models/tip.model'
    );
    expect(TipTransactionModel.modelName).toBe('TipTransaction');
  });

  it('status defaults to pending and attempts to 0', async () => {
    const { TipTransactionModel } = await import(
      '../src/modules/tips/models/tip.model'
    );
    const doc = new TipTransactionModel({
      intentId: new Types.ObjectId(),
      fanId: new Types.ObjectId(),
      artistId: new Types.ObjectId(),
      sessionId: new Types.ObjectId(),
      amountXlm: '10',
    });
    expect(doc.status).toBe('pending');
    expect(doc.attempts).toBe(0);
  });

  it('has retry worker index on status + nextRetryAt', async () => {
    const { TipTransactionModel } = await import(
      '../src/modules/tips/models/tip.model'
    );
    const indexes = TipTransactionModel.schema.indexes();
    const keys = indexes.map(([key]) => JSON.stringify(key));
    expect(keys.some((k) => k.includes('nextRetryAt'))).toBe(true);
  });
});

// ── CHORD-036: Moment, Vote, Unlock ───────────────────────────────────────────
describe('Moment model (CHORD-036)', () => {
  it('exports MomentModel with correct collection name', async () => {
    const { MomentModel } = await import(
      '../src/modules/interactive/models/interactive.model'
    );
    expect(MomentModel.modelName).toBe('Moment');
  });

  it('status defaults to active and voteCount to 0', async () => {
    const { MomentModel } = await import(
      '../src/modules/interactive/models/interactive.model'
    );
    const doc = new MomentModel({
      sessionId: new Types.ObjectId(),
      artistId: new Types.ObjectId(),
      offsetSeconds: 120,
      title: 'Epic Drop',
    });
    expect(doc.status).toBe('active');
    expect(doc.voteCount).toBe(0);
  });
});

describe('Vote model (CHORD-036)', () => {
  it('exports VoteModel with correct collection name', async () => {
    const { VoteModel } = await import(
      '../src/modules/interactive/models/interactive.model'
    );
    expect(VoteModel.modelName).toBe('Vote');
  });

  it('has unique compound index on momentId + fanId', async () => {
    const { VoteModel } = await import(
      '../src/modules/interactive/models/interactive.model'
    );
    const indexes = VoteModel.schema.indexes();
    const uniqueIdx = indexes.find(
      ([key, opts]) =>
        JSON.stringify(key).includes('momentId') &&
        JSON.stringify(key).includes('fanId') &&
        (opts as { unique?: boolean }).unique === true,
    );
    expect(uniqueIdx).toBeDefined();
  });
});

describe('Unlock model (CHORD-036)', () => {
  it('exports UnlockModel with correct collection name', async () => {
    const { UnlockModel } = await import(
      '../src/modules/interactive/models/interactive.model'
    );
    expect(UnlockModel.modelName).toBe('Unlock');
  });

  it('has unique compound index on fanId + momentId', async () => {
    const { UnlockModel } = await import(
      '../src/modules/interactive/models/interactive.model'
    );
    const indexes = UnlockModel.schema.indexes();
    const uniqueIdx = indexes.find(
      ([key, opts]) =>
        JSON.stringify(key).includes('fanId') &&
        JSON.stringify(key).includes('momentId') &&
        (opts as { unique?: boolean }).unique === true,
    );
    expect(uniqueIdx).toBeDefined();
  });

  it('rejects invalid unlock type', async () => {
    const { UnlockModel } = await import(
      '../src/modules/interactive/models/interactive.model'
    );
    const doc = new UnlockModel({
      fanId: new Types.ObjectId(),
      momentId: new Types.ObjectId(),
      sessionId: new Types.ObjectId(),
      type: 'free',
    });
    const err = doc.validateSync();
    expect(err?.errors['type']).toBeDefined();
  });
});
