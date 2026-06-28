import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { DocumentStatus, DocumentType } from './entities/patient-document.entity';

async function v(plain: object) {
  return validate(plainToInstance(QueryDocumentsDto, plain));
}

describe('QueryDocumentsDto', () => {
  it('valid empty object passes', async () => expect(await v({})).toHaveLength(0));
  it('valid status passes', async () => expect(await v({ status: DocumentStatus.ACTIVE })).toHaveLength(0));
  it('invalid status fails', async () => expect(await v({ status: 'bad' })).toHaveLength(1));
  it('valid limit passes', async () => expect(await v({ limit: 50 })).toHaveLength(0));
  it('limit over 200 fails', async () => expect(await v({ limit: 201 })).toHaveLength(1));
  it('negative offset fails', async () => expect(await v({ offset: -1 })).toHaveLength(1));
  it('valid documentType passes', async () => expect(await v({ documentType: DocumentType.LAB_RESULT })).toHaveLength(0));
});
