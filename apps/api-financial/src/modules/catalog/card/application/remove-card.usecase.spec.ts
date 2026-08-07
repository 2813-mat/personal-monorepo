import { ConflictException, NotFoundException } from '@nestjs/common';
import { RemoveCardUseCase } from './remove-card.usecase';

const build = (usage: unknown) => {
  const repo = { countUsage: jest.fn(async () => usage), remove: jest.fn(async () => true) };
  return { repo, uc: new RemoveCardUseCase(repo as never) };
};

describe('RemoveCardUseCase', () => {
  it('404 quando o cartão não existe', async () => {
    const { uc } = build(null);
    await expect(uc.execute('sumiu')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exclui o cartão zerado', async () => {
    const { uc, repo } = build({ transactions: 0, invoices: 0 });
    await uc.execute('c1');
    expect(repo.remove).toHaveBeenCalledWith('c1');
  });

  it('409 com as contagens quando há lançamento', async () => {
    const { uc, repo } = build({ transactions: 47, invoices: 0 });
    await expect(uc.execute('c1')).rejects.toMatchObject({
      response: { message: 'Cartão em uso', transactions: 47, invoices: 0 },
    });
    expect(repo.remove).not.toHaveBeenCalled();
  });

  // O caso que passa despercebido se só se testar lançamento: InvoiceHistory.cardId
  // é FK obrigatória, então apagar o cartão apagaria fatura fechada.
  it('409 também quando só há fatura fechada', async () => {
    const { uc, repo } = build({ transactions: 0, invoices: 8 });
    await expect(uc.execute('c1')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
