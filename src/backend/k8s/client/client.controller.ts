import { KubernetesObject } from '@kubernetes/client-node'
import {
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { K8sService } from '@backend/k8s/k8s.service'
import YAML from 'yaml'

@Injectable()
@Controller('k8s/Client')
export class ClientController {
  constructor(
    private k8sService: K8sService,
  ) {}

  @Get('/list')
  async List() {
    return this.k8sService.clientService.getKubeConfig().clusters
  }

  @Get('/CurrentCluster')
  async CurrentContext() {
    return this.k8sService.clientService.getCurrentContext()
  }

  @Get('/SetContext/:name')
  async SetContext(@Param('name') name: string) {
    return this.k8sService.clientService.setContext(name)
  }

  @Post('/update')
  async Update(@Body() obj: Array<string>) {
    const data = obj.pop().replace('\\n', '\n')
    const ko = YAML.parse(data) as KubernetesObject
    return await this.k8sService.clientService.update(ko)
  }

  @Post('/batch-upload')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'files', maxCount: 50 },
  ]))
  async BatchUpload(@UploadedFiles() files: { files?: Express.Multer.File[] }) {
    const results = []
    const errors = []

    if (!files.files || files.files.length === 0) {
      return {
        success: false,
        message: 'No files uploaded',
        results: [],
        errors: ['No files provided'],
      }
    }

    for (const file of files.files) {
      try {
        // Validate file type
        if (!file.originalname.endsWith('.yaml') && !file.originalname.endsWith('.yml')) {
          errors.push({
            fileName: file.originalname,
            error: 'Only YAML files are supported',
          })
          continue
        }

        // Parse YAML content
        const yamlContent = file.buffer.toString('utf-8')
        const yamlDocs = yamlContent.split('---').filter(doc => doc.trim())

        for (const doc of yamlDocs) {
          if (doc.trim()) {
            const ko = YAML.parse(doc.trim()) as KubernetesObject
            const result = await this.k8sService.clientService.update(ko)
            results.push({
              fileName: file.originalname,
              resource: `${ko.kind}/${ko.metadata?.name || 'unknown'}`,
              namespace: ko.metadata?.namespace || 'default',
              result,
            })
          }
        }
      }
      catch (error) {
        errors.push({
          fileName: file.originalname,
          error: error.message || 'Failed to process file',
        })
      }
    }

    return {
      success: errors.length === 0,
      message: `Processed ${files.files.length} files. ${results.length} resources created/updated, ${errors.length} errors.`,
      results,
      errors,
    }
  }
}
