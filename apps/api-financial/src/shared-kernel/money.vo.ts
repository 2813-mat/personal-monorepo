export class Money {
  private constructor(private readonly cents: number) {}
  static of(value: number): Money {
    if (Number.isNaN(value)) throw new Error('Money inválido: NaN');
    return new Money(Math.round(value * 100));
  }
  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }
  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }
  toNumber(): number {
    return this.cents / 100;
  }
}
