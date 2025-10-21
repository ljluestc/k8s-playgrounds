import { join } from 'node:path'
import { Module } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'
import { MulterModule } from '@nestjs/platform-express'
import { EventHubModule } from './eventHub/eventHub.module'
import { K8sModule } from './k8s/k8s.module'

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'frontend'),
    }),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 50, // Maximum 50 files
      },
    }),
    EventHubModule, K8sModule],
})
export class PlaygroundModule {}
