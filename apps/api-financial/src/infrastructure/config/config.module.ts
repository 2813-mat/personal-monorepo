import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { parseEnv } from './config.schema';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: parseEnv })],
})
export class AppConfigModule {}
