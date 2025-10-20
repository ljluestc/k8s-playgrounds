import {
  Body,
  Controller,
  Get, Injectable, Param,
  Post,
} from '@nestjs/common'
import { K8sService } from '@backend/k8s/k8s.service'
import { PersistentVolumeService } from './PersistentVolume.service'

@Controller('k8s/PersistentVolume')
@Injectable()
export class PersistentVolumeController {
  constructor(
    private k8sService: K8sService,
    private persistentVolumeService: PersistentVolumeService,
  ) {}

  @Get('/list')
  async List() {
    return await this.persistentVolumeService.List()
  }

  @Post('/delete')
  async Delete(@Body() nsn: Array<string>) {
    nsn.forEach((r) => {
      const nsname = r.split('/')
      const name = nsname[1]
      this.persistentVolumeService.Delete(name)
    })
    return {}
  }

  @Get('/:name')
  async GetOneByName(@Param('name') name: string) {
    return await this.persistentVolumeService.GetOneByName(name)
  }
}
