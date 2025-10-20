import {
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  Post
} from '@nestjs/common'
import { K8sService } from '@backend/k8s/k8s.service'

@Injectable()
@Controller('k8s/HorizontalPodAutoscaler')
export class HorizontalPodAutoscalerController {
  constructor(
    private k8sService: K8sService,
  ) {}

  @Get('/list')
  async List() {
    return await this.k8sService.horizontalPodAutoscalerService.List()
  }

  @Get('/ns/:ns')
  async ListByNs(@Param('ns') ns: string) {
    return await this.k8sService.horizontalPodAutoscalerService.List(ns)
  }

  @Post('/delete')
  async Delete(@Body() nsn: Array<string>) {
    nsn.forEach((r) => {
      const nsname = r.split('/')
      const ns = nsname[0]
      const name = nsname[1]
      this.k8sService.horizontalPodAutoscalerService.Delete(name, ns)
    })
    return {}
  }

  @Get('/ns/:ns/name/:name')
  async GetOneByNsName(@Param('ns') ns: string, @Param('name') name: string) {
    return await this.k8sService.horizontalPodAutoscalerService.GetOneByNsName(ns, name)
  }
}
