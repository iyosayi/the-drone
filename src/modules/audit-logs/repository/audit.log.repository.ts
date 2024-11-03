import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '@common/base.repository';
import { AuditLog, AuditLogDocument } from '../entities/audit-log.entity';


@Injectable()
export class AuditLogRepository extends BaseRepository<AuditLogDocument> {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {
    super(auditLogModel);
  }
}
