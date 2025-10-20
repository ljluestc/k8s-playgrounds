import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockK8sService } from '../../../../test/utils/k8s-mocks'

import { JobController } from './job.controller'

describe('JobController', () => {
  let controller: JobController
  let k8sService: any

  beforeEach(async () => {
    k8sService = createMockK8sService()
    controller = new JobController(k8sService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('List', () => {
    it('should return all jobs', async () => {
      const mockJobs = { items: [] }
      vi.spyOn(k8sService.jobService, 'List').mockResolvedValue(mockJobs as any)

      const result = await controller.List()

      expect(result).toEqual(mockJobs)
      expect(k8sService.jobService.List).toHaveBeenCalledWith()
    })

    it('should handle errors when listing jobs', async () => {
      const error = new Error('API error')
      vi.spyOn(k8sService.jobService, 'List').mockRejectedValue(error)

      await expect(controller.List()).rejects.toThrow('API error')
    })
  })

  describe('ListByNs', () => {
    it('should return jobs for a specific namespace', async () => {
      const mockJobs = { items: [] }
      const namespace = 'default'
      vi.spyOn(k8sService.jobService, 'List').mockResolvedValue(mockJobs as any)

      const result = await controller.ListByNs(namespace)

      expect(result).toEqual(mockJobs)
      expect(k8sService.jobService.List).toHaveBeenCalledWith(namespace)
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Invalid namespace')
      vi.spyOn(k8sService.jobService, 'List').mockRejectedValue(error)

      await expect(controller.ListByNs('invalid')).rejects.toThrow('Invalid namespace')
    })

    it('should handle empty namespace', async () => {
      const mockJobs = { items: [] }
      vi.spyOn(k8sService.jobService, 'List').mockResolvedValue(mockJobs as any)

      const result = await controller.ListByNs('')

      expect(result).toEqual(mockJobs)
      expect(k8sService.jobService.List).toHaveBeenCalledWith('')
    })

    it('should list jobs in kube-system namespace', async () => {
      const mockJobs = { items: [] }
      vi.spyOn(k8sService.jobService, 'List').mockResolvedValue(mockJobs as any)

      const result = await controller.ListByNs('kube-system')

      expect(result).toEqual(mockJobs)
      expect(k8sService.jobService.List).toHaveBeenCalledWith('kube-system')
    })

    it('should list jobs in custom namespace', async () => {
      const mockJobs = { items: [] }
      vi.spyOn(k8sService.jobService, 'List').mockResolvedValue(mockJobs as any)

      const result = await controller.ListByNs('my-namespace')

      expect(result).toEqual(mockJobs)
      expect(k8sService.jobService.List).toHaveBeenCalledWith('my-namespace')
    })
  })

  describe('GetOneByNsName', () => {
    it('should return a single job', async () => {
      const mockJob = {
        metadata: { name: 'test-job', namespace: 'default' },
        spec: { template: { spec: { containers: [{ name: 'test', image: 'busybox' }] } } },
        status: { succeeded: 1 },
      }
      vi.spyOn(k8sService.jobService, 'GetOneByNsName').mockResolvedValue(mockJob as any)

      const result = await controller.GetOneByNsName('default', 'test-job')

      expect(result).toEqual(mockJob)
      expect(k8sService.jobService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-job')
    })

    it('should handle not found errors', async () => {
      vi.spyOn(k8sService.jobService, 'GetOneByNsName').mockRejectedValue(new Error('Not found'))

      await expect(controller.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Not found')
    })

    it('should handle special characters in job name', async () => {
      const mockJob = { metadata: { name: 'test-job-123', namespace: 'default' } }
      vi.spyOn(k8sService.jobService, 'GetOneByNsName').mockResolvedValue(mockJob as any)

      const result = await controller.GetOneByNsName('default', 'test-job-123')

      expect(result).toEqual(mockJob)
      expect(k8sService.jobService.GetOneByNsName).toHaveBeenCalledWith('default', 'test-job-123')
    })

    it('should handle special characters in namespace', async () => {
      const mockJob = { metadata: { name: 'test-job', namespace: 'kube-system' } }
      vi.spyOn(k8sService.jobService, 'GetOneByNsName').mockResolvedValue(mockJob as any)

      const result = await controller.GetOneByNsName('kube-system', 'test-job')

      expect(result).toEqual(mockJob)
      expect(k8sService.jobService.GetOneByNsName).toHaveBeenCalledWith('kube-system', 'test-job')
    })

    it('should get completed job', async () => {
      const mockJob = {
        metadata: { name: 'completed-job', namespace: 'default' },
        status: { succeeded: 1, failed: 0 },
      }
      vi.spyOn(k8sService.jobService, 'GetOneByNsName').mockResolvedValue(mockJob as any)

      const result = await controller.GetOneByNsName('default', 'completed-job')

      expect(result).toEqual(mockJob)
      expect(result.status?.succeeded).toBe(1)
    })

    it('should get failed job', async () => {
      const mockJob = {
        metadata: { name: 'failed-job', namespace: 'default' },
        status: { succeeded: 0, failed: 3 },
      }
      vi.spyOn(k8sService.jobService, 'GetOneByNsName').mockResolvedValue(mockJob as any)

      const result = await controller.GetOneByNsName('default', 'failed-job')

      expect(result).toEqual(mockJob)
      expect(result.status?.failed).toBe(3)
    })

    it('should get running job', async () => {
      const mockJob = {
        metadata: { name: 'running-job', namespace: 'default' },
        status: { active: 1 },
      }
      vi.spyOn(k8sService.jobService, 'GetOneByNsName').mockResolvedValue(mockJob as any)

      const result = await controller.GetOneByNsName('default', 'running-job')

      expect(result).toEqual(mockJob)
      expect(result.status?.active).toBe(1)
    })
  })

  describe('Delete', () => {
    it('should delete a single job', async () => {
      vi.spyOn(k8sService.jobService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-job']
      await controller.Delete(nsn)

      expect(k8sService.jobService.Delete).toHaveBeenCalledWith('test-job', 'default')
    })

    it('should delete multiple jobs', async () => {
      vi.spyOn(k8sService.jobService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/job1', 'kube-system/job2', 'default/job3']
      await controller.Delete(nsn)

      expect(k8sService.jobService.Delete).toHaveBeenCalledTimes(3)
      expect(k8sService.jobService.Delete).toHaveBeenCalledWith('job1', 'default')
      expect(k8sService.jobService.Delete).toHaveBeenCalledWith('job2', 'kube-system')
      expect(k8sService.jobService.Delete).toHaveBeenCalledWith('job3', 'default')
    })

    it('should handle empty array', async () => {
      vi.spyOn(k8sService.jobService, 'Delete').mockResolvedValue(undefined)

      const nsn: string[] = []
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
      expect(k8sService.jobService.Delete).not.toHaveBeenCalled()
    })

    it('should continue deleting even if one fails', async () => {
      vi.spyOn(k8sService.jobService, 'Delete')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined)

      const nsn = ['default/job1', 'default/job2', 'default/job3']

      // Should not throw, continues with other deletions
      await controller.Delete(nsn)

      expect(k8sService.jobService.Delete).toHaveBeenCalledTimes(3)
    })

    it('should handle jobs with slashes in namespace/name format', async () => {
      vi.spyOn(k8sService.jobService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['my-namespace/my-job-name']
      await controller.Delete(nsn)

      expect(k8sService.jobService.Delete).toHaveBeenCalledWith('my-job-name', 'my-namespace')
    })

    it('should return empty object after deletion', async () => {
      vi.spyOn(k8sService.jobService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/test-job']
      const result = await controller.Delete(nsn)

      expect(result).toEqual({})
    })

    it('should delete jobs from different namespaces', async () => {
      vi.spyOn(k8sService.jobService, 'Delete').mockResolvedValue(undefined)

      const nsn = [
        'default/job-1',
        'kube-system/system-job',
        'my-namespace/custom-job',
        'production/prod-job',
      ]
      await controller.Delete(nsn)

      expect(k8sService.jobService.Delete).toHaveBeenCalledTimes(4)
      expect(k8sService.jobService.Delete).toHaveBeenCalledWith('job-1', 'default')
      expect(k8sService.jobService.Delete).toHaveBeenCalledWith('system-job', 'kube-system')
      expect(k8sService.jobService.Delete).toHaveBeenCalledWith('custom-job', 'my-namespace')
      expect(k8sService.jobService.Delete).toHaveBeenCalledWith('prod-job', 'production')
    })

    it('should handle job names with multiple hyphens', async () => {
      vi.spyOn(k8sService.jobService, 'Delete').mockResolvedValue(undefined)

      const nsn = ['default/my-complex-job-name-123']
      await controller.Delete(nsn)

      expect(k8sService.jobService.Delete).toHaveBeenCalledWith('my-complex-job-name-123', 'default')
    })
  })
})
