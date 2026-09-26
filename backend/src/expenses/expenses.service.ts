import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActivityLogsService } from '../activity-logs/activity-logs.service.js';
import { ActionType } from '../generated/prisma/enums.js';
import { TripAccessService } from '../trips/trips-access.service.js';
import { CreateExpenseDto } from './expenses.dto.js';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
    private tripAccessService: TripAccessService,
  ) {}

  async create(dto: CreateExpenseDto, workerId: string) {
    if (dto.tripId) {
      await this.tripAccessService.assertOwnership(dto.tripId, workerId);
    }

    return this.prisma.$transaction(async (tx) => {
      // idempotent on clientId — safe if the device retries after a dropped connection
      const existing = await tx.expense.findUnique({
        where: { clientId: dto.clientId },
      });
      if (existing) {
        if (existing.workerId !== workerId) {
          throw new ForbiddenException(
            'You do not have access to this expense',
          );
        }
        return existing;
      }

      const expense = await tx.expense.create({
        data: {
          clientId: dto.clientId,
          workerId,
          tripId: dto.tripId,
          description: dto.description,
          amount: dto.amount,
          createdAtClient: new Date(dto.createdAtClient),
        },
      });

      await this.activityLogsService.record(
        {
          clientId: dto.activityLogClientId,
          tripId: dto.tripId,
          workerId,
          actionType: ActionType.EXPENSE_RECORDED,
          payload: {
            expenseId: expense.id,
            description: dto.description,
            amount: dto.amount,
          },
          createdAtClient: dto.createdAtClient,
        },
        tx,
      );

      return expense;
    });
  }

  async findMine(workerId: string) {
    return this.prisma.expense.findMany({
      where: { workerId },
      orderBy: { createdAtClient: 'desc' },
    });
  }

  async getAll() {
    return this.prisma.expense.findMany({
      orderBy: { createdAtClient: 'desc' },
      include: { worker: { select: { id: true, name: true } } },
    });
  }
}
