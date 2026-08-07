import { BadRequestException } from '@nestjs/common';

/**
 * O ValidationPipe global já roda com `forbidNonWhitelisted` (main.ts), então
 * campo com nome errado devolve 400 sozinho. O que sobra é o corpo
 * genuinamente vazio, que passaria como `{}` e viraria um no-op com 200.
 */
export function requireNonEmptyPatch<T extends object>(dto: T): T {
  if (Object.keys(dto).length === 0) {
    throw new BadRequestException('Informe ao menos um campo para alterar');
  }
  return dto;
}
