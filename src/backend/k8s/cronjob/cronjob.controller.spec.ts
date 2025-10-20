
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

import { CronJobController } from './cronjob.controller'

describe('CronJobController', () => {
  let controller: CronJobController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new CronJobController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all cronjobs', async () => {
      const mockCronJobs = { items: [] }
      vi.spyOn(k8sService.cronJobService, 'List').mockResolvedValue(mockCronJobs as any)

      const result = await controller.List()

      expect(result).toEqual(mockCronJobs)
      expect(k8sService.cronJobService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing cronjobs', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.cronJobService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })
  })

  describe('ListByNs', () => {
    it('should return cronjobs for a specific namespace', async () => {
      const mockCronJobs = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.cronJobService, 'List').mockResolvedValue(mockCronJobs as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockCronJobs)
      expect(k8sService.cronJobService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.cronJobService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockCronJobs = { items: [] }
      vi.spyOn(k8sService.cronJobService, 'List').mockResolvedValue(mockCronJobs as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockCronJobs)
      expect(k8sService.cronJobService.List).toHaveBeenCalledWith('')
    })

    it('should list cronjobs in kube-system namespace', async () => {
      const mockCronJobs = { items: [] }
      vi.spyOn(k8sService.cronJobService, 'List').mockResolvedValue(mockCronJobs as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockCronJobs)
      expect(k8sService.cronJobService.List).toHaveBeenCalledWith('kube-system')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single cronjob', async () => {
      const mockCronJob = {
        metadata: { name: 'test-cronjob', namespace: 'default' },
        spec: { schedule: '*/5 * * * *' },
      }
      vi.spyOn(k8sService.cronJobService, 'GetOneByNsName').mockResolvedValue(mockCronJob as any)

      const result = await controller.GetOneByNsName('default', 'test-cronjob')

      expect(result).toEqual(mockCronJob)
      expect(k8sService.cronJobService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-cronjob')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.cronJobService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in cronjob name', async () => {
      const mockCronJob = { metadata: { name: 'test-cronjob-123', namespace: 'default' } }
      vi.spyOn(k8sService.cronJobService, 'GetOneByNsName').mockResolvedValue(mockCronJob as any)

      const result = await controller.GetOneByNsName('default', 'test-cronjob-123')

      expect(result).toEqual(mockCronJob)
      expect(k8sService.cronJobService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-cronjob-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockCronJob = { metadata: { name: 'test-cronjob', namespace: 'kube-system' } }
      vi.spyOn(k8sService.cronJobService, 'GetOneByNsName').mockResolvedValue(mockCronJob as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-cronjob')

      expect(result).toEqual(mockCronJob)
      expect(k8sService.cronJobService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-cronjob')
    })
  })

  describe('Delete', () => {
    it('should delete a single cronjob', async () => {
      vi.spyOn(k8sService.cronJobService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-cronjob']
      await controller.Delete(nsn)

      expect(k8sService.cronJobService.Delete).toHaveBeenCalledWith('test-cronjob', 'default')
    })

    it('should delete multiple cronjobs', async () => {
      vi.spyOn(k8sService.cronJobService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/cronjob1', 'kube-system/cronjob2', 'default/cronjob3']
      await controller.Delete(nsn)

      expect(k8sService.cronJobService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.cronJobService.Delete).toHaveBeenCalledWith('cronjob1', 'default')
      expect(k8sService.cronJobService.Delete).toHaveBeenCalledWith('cronjob2', 'kube-system')
      expect(k8sService.cronJobService.Delete).toHaveBeenCalledWith('cronjob3', 'default')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.cronJobService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.cronJobService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.cronJobService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/cronjob1', 'default/cronjob2', 'default/cronjob3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.cronJobService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle cronjobs with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.cronJobService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-cronjob-name']
      await controller.Delete(nsn)

      expect(k8sService.cronJobService.Delete).toHaveBeenCalledWith('my-cronjob-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.cronJobService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-cronjob']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })
  })

  describe('Suspend', () => {
    it('should suspend a cronjob', async () => {
      const mockResponse = { spec: { suspend: true } }
      vi.spyOn(k8sService.cronJobService, 'Suspend').mockResolvedValue(mockResponse as any)

      const result = await controller.Suspend('default', 'test-cronjob')

      expect(result).toEqual(mockResponse)
      expect(k8sService.cronJobService.Suspend).toHaveBeenCalledWith('default', 'test-cronjob')
    })

    it('should handle errors when suspending cronjob', async () => {
      const error = new Error('Suspend failed')
      vi.spyOn(k8sService.cronJobService, 'Suspend').mockRejectedValue(error)

      await expect(controller.Suspend('default', 'test-cronjob')).rejects.toThrow('Suspend failed')
    })

    it('should suspend cronjob in different namespace', async () => {
      const mockResponse = { spec: { suspend: true } }
      vi.spyOn(k8sService.cronJobService, 'Suspend').mockResolvedValue(mockResponse as any)

      const result = await controller.Suspend('production', 'backup-cronjob')

      expect(result).toEqual(mockResponse)
      expect(k8sService.cronJobService.Suspend).toHaveBeenCalledWith('production', 'backup-cronjob')
    })

    it('should handle suspending non-existent cronjob', async () => {
      const error = new Error('CronJob not found')
      vi.spyOn(k8sService.cronJobService, 'Suspend').mockRejectedValue(error)

      await expect(controller.Suspend('default', 'nonexistent')).rejects.toThrow('CronJob not found')
    })
  })

  describe('Resume', () => {
    it('should resume a cronjob', async () => {
      const mockResponse = { spec: { suspend: false } }
      vi.spyOn(k8sService.cronJobService, 'Resume').mockResolvedValue(mockResponse as any)

      const result = await controller.Resume('default', 'test-cronjob')

      expect(result).toEqual(mockResponse)
      expect(k8sService.cronJobService.Resume).toHaveBeenCalledWith('default', 'test-cronjob')
    })

    it('should handle errors when resuming cronjob', async () => {
      const error = new Error('Resume failed')
      vi.spyOn(k8sService.cronJobService, 'Resume').mockRejectedValue(error)

      await expect(controller.Resume('default', 'test-cronjob')).rejects.toThrow('Resume failed')
    })

    it('should resume cronjob in different namespace', async () => {
      const mockResponse = { spec: { suspend: false } }
      vi.spyOn(k8sService.cronJobService, 'Resume').mockResolvedValue(mockResponse as any)

      const result = await controller.Resume('production', 'backup-cronjob')

      expect(result).toEqual(mockResponse)
      expect(k8sService.cronJobService.Resume).toHaveBeenCalledWith('production', 'backup-cronjob')
    })

    it('should handle resuming non-existent cronjob', async () => {
      const error = new Error('CronJob not found')
      vi.spyOn(k8sService.cronJobService, 'Resume').mockRejectedValue(error)

      await expect(controller.Resume('default', 'nonexistent')).rejects.toThrow('CronJob not found')
    })
  })

  describe('Trigger', () => {
    it('should trigger a cronjob', async () => {
      const mockJob = {
        metadata: { name: 'test-cronjob-manual-abc1234', namespace: 'default' },
        spec: { template: { spec: { containers: [] } } },
      }
      vi.spyOn(k8sService.cronJobService, 'Trigger').mockResolvedValue(mockJob as any)

      const result = await controller.Trigger('default', 'test-cronjob')

      expect(result).toEqual(mockJob)
      expect(k8sService.cronJobService.Trigger).toHaveBeenCalledWith('default', 'test-cronjob')
    })

    it('should handle errors when triggering cronjob', async () => {
      const error = new Error('Trigger failed')
      vi.spyOn(k8sService.cronJobService, 'Trigger').mockRejectedValue(error)

      await expect(controller.Trigger('default', 'test-cronjob')).rejects.toThrow('Trigger failed')
    })

    it('should trigger cronjob in different namespace', async () => {
      const mockJob = {
        metadata: { name: 'backup-cronjob-manual-xyz9876', namespace: 'production' },
        spec: { template: { spec: { containers: [] } } },
      }
      vi.spyOn(k8sService.cronJobService, 'Trigger').mockResolvedValue(mockJob as any)

      const result = await controller.Trigger('production', 'backup-cronjob')

      expect(result).toEqual(mockJob)
      expect(k8sService.cronJobService.Trigger).toHaveBeenCalledWith('production', 'backup-cronjob')
    })

    it('should handle triggering non-existent cronjob', async () => {
      const error = new Error('CronJob not found')
      vi.spyOn(k8sService.cronJobService, 'Trigger').mockRejectedValue(error)

      await expect(controller.Trigger('default', 'nonexistent')).rejects.toThrow('CronJob not found')
    })

    it('should handle triggering suspended cronjob', async () => {
      const mockJob = {
        metadata: { name: 'suspended-cronjob-manual-def5678', namespace: 'default' },
        spec: { template: { spec: { containers: [] } } },
      }
      vi.spyOn(k8sService.cronJobService, 'Trigger').mockResolvedValue(mockJob as any)

      const result = await controller.Trigger('default', 'suspended-cronjob')

      expect(result).toEqual(mockJob)
      expect(k8sService.cronJobService.Trigger).toHaveBeenCalledWith('default', 'suspended-cronjob')
    })
  })
})
