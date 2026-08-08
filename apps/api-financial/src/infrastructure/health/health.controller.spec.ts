import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('informa que o processo esta vivo', () => {
    const controller = new HealthController({} as never);
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('informa readiness quando o banco responde', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const controller = new HealthController(prisma as never);

    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up' },
    });
  });

  it('responde indisponivel quando o banco falha', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('database down')) };
    const controller = new HealthController(prisma as never);

    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
