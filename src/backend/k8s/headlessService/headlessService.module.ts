import { Module } from '@nestjs/common'
import { ClientModule } from '../client/client.module'
import { HeadlessServiceController } from './headlessService.controller'
import { HeadlessServiceService } from './headlessService.service'

@Module({
  imports: [ClientModule],
  controllers: [HeadlessServiceController],
  providers: [HeadlessServiceService],
  exports: [HeadlessServiceService],
})
export class HeadlessServiceModule {}
