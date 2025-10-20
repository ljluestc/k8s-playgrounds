import { vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { V1Job } from '@kubernetes/client-node'
import { ClientService } from '../client/client.service'
import { JobService } from '../job/job.service'
import { createCronJob, createJob, createMockClientService } from '../../../../test/utils/k8s-mocks'
import { CronJobService } from './cronjob.service'

describe('CronJobService', () => {
  let service: CronJobService
  let clientService: any
  let jobService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    const mockJobService = {
      Create: vi.fn(),
    }
    mockK8sApi = mockClientService.getBatchV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CronJobService,
          useFactory: (clientService: ClientService, jobService: JobService) => {
            return new CronJobService(clientService, jobService)
          },
          inject: [ClientService, JobService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
        {
          provide: JobService,
          useValue: mockJobService,
        },
      ],
    }).compile()

    service = module.get<CronJobService>(CronJobService)
    clientService = mockClientService
    jobService = mockJobService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all cronjobs across all namespaces when no namespace specified', async () => {
      const mockCronJobs = [createCronJob('cronjob-1', 'default'), createCronJob('cronjob-2', 'kube-system')]
      mockK8sApi.listCronJobForAllNamespaces.mockResolvedValue({
        body: { items: mockCronJobs },
      })

      const result = await service.List()

      expect(result).toEqual(mockCronJobs)
      expect(mockK8sApi.listCronJobForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedCronJob).not.toHaveBeenCalled()
    })

    it('should list all cronjobs when namespace is "null" string', async () => {
      const mockCronJobs = [createCronJob('cronjob-1')]
      mockK8sApi.listCronJobForAllNamespaces.mockResolvedValue({
        body: { items: mockCronJobs },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockCronJobs)
      expect(mockK8sApi.listCronJobForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedCronJob).not.toHaveBeenCalled()
    })

    it('should list cronjobs in a specific namespace', async () => {
      const mockCronJobs = [createCronJob('cronjob-1', 'default')]
      mockK8sApi.listNamespacedCronJob.mockResolvedValue({
        body: { items: mockCronJobs },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockCronJobs)
      expect(mockK8sApi.listNamespacedCronJob).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listCronJobForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all cronjobs', async () => {
      const error = new Error('API Error')
      mockK8sApi.listCronJobForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced cronjobs', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedCronJob.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no cronjobs exist', async () => {
      mockK8sApi.listCronJobForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list cronjobs in kube-system namespace', async () => {
      const mockCronJobs = [createCronJob('system-cleanup', 'kube-system')]
      mockK8sApi.listNamespacedCronJob.mockResolvedValue({
        body: { items: mockCronJobs },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockCronJobs)
      expect(mockK8sApi.listNamespacedCronJob).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockCronJobs = [createCronJob('my-cronjob', 'my-namespace-123')]
      mockK8sApi.listNamespacedCronJob.mockResolvedValue({
        body: { items: mockCronJobs },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockCronJobs)
      expect(mockK8sApi.listNamespacedCronJob).toHaveBeenCalledWith('my-namespace-123')
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single cronjob by namespace and name', async () => {
      const mockCronJob = createCronJob('test-cronjob', 'default')
      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })

      const result = await service.GetOneByNsName('default', 'test-cronjob')

      expect(result).toEqual(mockCronJob)
      expect(mockK8sApi.readNamespacedCronJob).toHaveBeenCalledWith('test-cronjob', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('CronJob not found')
      mockK8sApi.readNamespacedCronJob.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('CronJob not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedCronJob.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-cronjob')).rejects.toThrow('Namespace does not exist')
    })

    it('should get cronjob with different schedules', async () => {
      const mockCronJob = createCronJob('hourly-job', 'default')
      mockCronJob.spec!.schedule = '0 * * * *'
      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })

      const result = await service.GetOneByNsName('default', 'hourly-job')

      expect(result).toEqual(mockCronJob)
      expect(result.spec?.schedule).toBe('0 * * * *')
    })

    it('should get suspended cronjob', async () => {
      const mockCronJob = createCronJob('suspended-job', 'default')
      mockCronJob.spec!.suspend = true
      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })

      const result = await service.GetOneByNsName('default', 'suspended-job')

      expect(result).toEqual(mockCronJob)
      expect(result.spec?.suspend).toBe(true)
    })

    it('should handle cronjob names with hyphens and numbers', async () => {
      const mockCronJob = createCronJob('my-cronjob-123', 'default')
      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })

      const result = await service.GetOneByNsName('default', 'my-cronjob-123')

      expect(result).toEqual(mockCronJob)
      expect(mockK8sApi.readNamespacedCronJob).toHaveBeenCalledWith('my-cronjob-123', 'default')
    })

    it('should get cronjob with concurrency policy', async () => {
      const mockCronJob = createCronJob('concurrent-job', 'default')
      mockCronJob.spec!.concurrencyPolicy = 'Forbid'
      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })

      const result = await service.GetOneByNsName('default', 'concurrent-job')

      expect(result).toEqual(mockCronJob)
      expect(result.spec?.concurrencyPolicy).toBe('Forbid')
    })
  })

  describe('Delete', () => {
    it('should delete a cronjob', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedCronJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-cronjob', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedCronJob).toHaveBeenCalledWith('test-cronjob', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedCronJob.mockRejectedValue(error)

      await expect(service.Delete('test-cronjob', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent cronjob', async () => {
      const error = new Error('CronJob not found')
      mockK8sApi.deleteNamespacedCronJob.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('CronJob not found')
    })

    it('should delete cronjob from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedCronJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-cronjob', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedCronJob).toHaveBeenCalledWith('my-cronjob', 'kube-system')
    })

    it('should handle cronjob with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedCronJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('cronjob-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedCronJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete cronjobs')
      mockK8sApi.deleteNamespacedCronJob.mockRejectedValue(error)

      await expect(service.Delete('test-cronjob', 'default')).rejects.toThrow('Forbidden')
    })
  })

  describe('Trigger', () => {
    it('should trigger a cronjob and create a job', async () => {
      const mockCronJob = createCronJob('test-cronjob', 'default')
      const mockJob = createJob('test-cronjob-manual-abc1234', 'default')

      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })
      jobService.Create.mockResolvedValue(mockJob)

      const result = await service.Trigger('default', 'test-cronjob')

      expect(result).toEqual(mockJob)
      expect(mockK8sApi.readNamespacedCronJob).toHaveBeenCalledWith('test-cronjob', 'default')
      expect(jobService.Create).toHaveBeenCalled()

      const createdJob = jobService.Create.mock.calls[0][1] as V1Job
      expect(createdJob.kind).toBe('Job')
      expect(createdJob.apiVersion).toBe('batch/v1')
      expect(createdJob.metadata?.name).toMatch(/^test-cronjob-manual-[a-z0-9]{7}$/)
      expect(createdJob.metadata?.annotations).toEqual({
        'cronjob.kubernetes.io/instantiate': 'manual',
      })
    })

    it('should create job with owner references', async () => {
      const mockCronJob = createCronJob('owner-test', 'default')
      const mockJob = createJob('owner-test-manual-xyz9876', 'default')

      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })
      jobService.Create.mockResolvedValue(mockJob)

      await service.Trigger('default', 'owner-test')

      const createdJob = jobService.Create.mock.calls[0][1] as V1Job
      expect(createdJob.metadata?.ownerReferences).toBeDefined()
      expect(createdJob.metadata?.ownerReferences?.length).toBe(1)
      expect(createdJob.metadata?.ownerReferences?.[0]).toEqual({
        apiVersion: mockCronJob.apiVersion,
        kind: mockCronJob.kind,
        name: mockCronJob.metadata!.name,
        uid: mockCronJob.metadata!.uid,
      })
    })

    it('should copy job template spec correctly', async () => {
      const mockCronJob = createCronJob('template-test', 'default')
      const mockJob = createJob('template-test-manual-def5678', 'default')

      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })
      jobService.Create.mockResolvedValue(mockJob)

      await service.Trigger('default', 'template-test')

      const createdJob = jobService.Create.mock.calls[0][1] as V1Job
      expect(createdJob.spec?.template.metadata).toEqual(mockCronJob.spec!.jobTemplate.spec!.template.metadata)
      expect(createdJob.spec?.template.spec).toEqual(mockCronJob.spec!.jobTemplate.spec!.template.spec)
    })

    it('should handle trigger errors when cronjob not found', async () => {
      const error = new Error('CronJob not found')
      mockK8sApi.readNamespacedCronJob.mockRejectedValue(error)

      await expect(service.Trigger('default', 'nonexistent')).rejects.toThrow('CronJob not found')
    })

    it('should handle errors when creating job fails', async () => {
      const mockCronJob = createCronJob('fail-test', 'default')
      const error = new Error('Failed to create job')

      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })
      jobService.Create.mockRejectedValue(error)

      await expect(service.Trigger('default', 'fail-test')).rejects.toThrow('Failed to create job')
    })

    it('should trigger cronjob in different namespace', async () => {
      const mockCronJob = createCronJob('production-job', 'production')
      const mockJob = createJob('production-job-manual-ghi0123', 'production')

      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })
      jobService.Create.mockResolvedValue(mockJob)

      const result = await service.Trigger('production', 'production-job')

      expect(result).toEqual(mockJob)
      expect(jobService.Create).toHaveBeenCalledWith('production', expect.any(Object))
    })

    it('should trigger suspended cronjob', async () => {
      const mockCronJob = createCronJob('suspended-job', 'default')
      mockCronJob.spec!.suspend = true
      const mockJob = createJob('suspended-job-manual-jkl4567', 'default')

      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })
      jobService.Create.mockResolvedValue(mockJob)

      const result = await service.Trigger('default', 'suspended-job')

      expect(result).toEqual(mockJob)
      expect(jobService.Create).toHaveBeenCalled()
    })

    it('should generate unique job names on each trigger', async () => {
      const mockCronJob = createCronJob('unique-test', 'default')
      const mockJob1 = createJob('unique-test-manual-aaa0001', 'default')
      const mockJob2 = createJob('unique-test-manual-bbb0002', 'default')

      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })
      jobService.Create.mockResolvedValueOnce(mockJob1).mockResolvedValueOnce(mockJob2)

      await service.Trigger('default', 'unique-test')
      await service.Trigger('default', 'unique-test')

      const firstJobName = (jobService.Create.mock.calls[0][1] as V1Job).metadata?.name
      const secondJobName = (jobService.Create.mock.calls[1][1] as V1Job).metadata?.name

      expect(firstJobName).not.toEqual(secondJobName)
      expect(firstJobName).toMatch(/^unique-test-manual-[a-z0-9]{7}$/)
      expect(secondJobName).toMatch(/^unique-test-manual-[a-z0-9]{7}$/)
    })
  })

  describe('Suspend', () => {
    it('should suspend a cronjob', async () => {
      const mockResponse = { spec: { suspend: true } }
      mockK8sApi.patchNamespacedCronJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Suspend('default', 'test-cronjob')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.patchNamespacedCronJob).toHaveBeenCalledWith(
        'test-cronjob',
        'default',
        { spec: { suspend: true } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/strategic-merge-patch+json',
            'Accept': 'application/json, */*',
          },
        },
      )
    })

    it('should handle errors when suspending', async () => {
      const error = new Error('Suspend failed')
      mockK8sApi.patchNamespacedCronJob.mockRejectedValue(error)

      await expect(service.Suspend('default', 'test-cronjob')).rejects.toThrow('Suspend failed')
    })

    it('should suspend cronjob in different namespace', async () => {
      const mockResponse = { spec: { suspend: true } }
      mockK8sApi.patchNamespacedCronJob.mockResolvedValue({
        body: mockResponse,
      })

      await service.Suspend('production', 'backup-job')

      expect(mockK8sApi.patchNamespacedCronJob).toHaveBeenCalledWith(
        'backup-job',
        'production',
        { spec: { suspend: true } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.any(Object),
      )
    })

    it('should handle suspending non-existent cronjob', async () => {
      const error = new Error('CronJob not found')
      mockK8sApi.patchNamespacedCronJob.mockRejectedValue(error)

      await expect(service.Suspend('default', 'nonexistent')).rejects.toThrow('CronJob not found')
    })
  })

  describe('Resume', () => {
    it('should resume a cronjob', async () => {
      const mockResponse = { spec: { suspend: false } }
      mockK8sApi.patchNamespacedCronJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Resume('default', 'test-cronjob')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.patchNamespacedCronJob).toHaveBeenCalledWith(
        'test-cronjob',
        'default',
        { spec: { suspend: false } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/strategic-merge-patch+json',
            'Accept': 'application/json, */*',
          },
        },
      )
    })

    it('should handle errors when resuming', async () => {
      const error = new Error('Resume failed')
      mockK8sApi.patchNamespacedCronJob.mockRejectedValue(error)

      await expect(service.Resume('default', 'test-cronjob')).rejects.toThrow('Resume failed')
    })

    it('should resume cronjob in different namespace', async () => {
      const mockResponse = { spec: { suspend: false } }
      mockK8sApi.patchNamespacedCronJob.mockResolvedValue({
        body: mockResponse,
      })

      await service.Resume('production', 'backup-job')

      expect(mockK8sApi.patchNamespacedCronJob).toHaveBeenCalledWith(
        'backup-job',
        'production',
        { spec: { suspend: false } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.any(Object),
      )
    })

    it('should handle resuming non-existent cronjob', async () => {
      const error = new Error('CronJob not found')
      mockK8sApi.patchNamespacedCronJob.mockRejectedValue(error)

      await expect(service.Resume('default', 'nonexistent')).rejects.toThrow('CronJob not found')
    })
  })

  describe('setSuspendStatus', () => {
    it('should set suspend status to true', async () => {
      const mockResponse = { spec: { suspend: true } }
      mockK8sApi.patchNamespacedCronJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.setSuspendStatus('default', 'test-cronjob', true)

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.patchNamespacedCronJob).toHaveBeenCalledWith(
        'test-cronjob',
        'default',
        { spec: { suspend: true } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/strategic-merge-patch+json',
          }),
        }),
      )
    })

    it('should set suspend status to false', async () => {
      const mockResponse = { spec: { suspend: false } }
      mockK8sApi.patchNamespacedCronJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.setSuspendStatus('default', 'test-cronjob', false)

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.patchNamespacedCronJob).toHaveBeenCalledWith(
        'test-cronjob',
        'default',
        { spec: { suspend: false } },
        'true',
        undefined,
        undefined,
        undefined,
        undefined,
        expect.any(Object),
      )
    })

    it('should use correct headers for patch request', async () => {
      mockK8sApi.patchNamespacedCronJob.mockResolvedValue({
        body: { spec: { suspend: true } },
      })

      await service.setSuspendStatus('default', 'test-cronjob', true)

      const callArgs = mockK8sApi.patchNamespacedCronJob.mock.calls[0]
      const headers = callArgs[8].headers
      expect(headers['Content-Type']).toBe('application/strategic-merge-patch+json')
      expect(headers['Accept']).toBe('application/json, */*')
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockCronJobs = [createCronJob('test-cronjob')]
      mockK8sApi.listCronJobForAllNamespaces.mockResolvedValue({
        body: { items: mockCronJobs },
      })

      await service.List()

      expect(clientService.getBatchV1Api).toHaveBeenCalled()
    })

    it('should call getBatchV1Api for every operation', async () => {
      mockK8sApi.listCronJobForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedCronJob.mockResolvedValue({ body: createCronJob('test') })
      mockK8sApi.deleteNamespacedCronJob.mockResolvedValue({ body: { status: 'Success' } })
      mockK8sApi.patchNamespacedCronJob.mockResolvedValue({ body: { spec: { suspend: true } } })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')
      await service.Suspend('default', 'test')

      expect(clientService.getBatchV1Api).toHaveBeenCalledTimes(5)
    })
  })

  describe('Job Service Integration', () => {
    it('should use JobService to create jobs when triggering', async () => {
      const mockCronJob = createCronJob('test-cronjob', 'default')
      const mockJob = createJob('test-cronjob-manual-abc1234', 'default')

      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })
      jobService.Create.mockResolvedValue(mockJob)

      await service.Trigger('default', 'test-cronjob')

      expect(jobService.Create).toHaveBeenCalledWith('default', expect.any(Object))
    })

    it('should pass correct namespace to JobService.Create', async () => {
      const mockCronJob = createCronJob('test-cronjob', 'custom-namespace')
      const mockJob = createJob('test-cronjob-manual-xyz9876', 'custom-namespace')

      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })
      jobService.Create.mockResolvedValue(mockJob)

      await service.Trigger('custom-namespace', 'test-cronjob')

      expect(jobService.Create).toHaveBeenCalledWith('custom-namespace', expect.any(Object))
    })
  })

  describe('Edge Cases', () => {
    it('should handle cronjob with complex schedule', async () => {
      const mockCronJob = createCronJob('complex-schedule', 'default')
      mockCronJob.spec!.schedule = '0 0 1 1 *' // Yearly on Jan 1st at midnight
      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })

      const result = await service.GetOneByNsName('default', 'complex-schedule')

      expect(result.spec?.schedule).toBe('0 0 1 1 *')
    })

    it('should handle cronjob with successfulJobsHistoryLimit', async () => {
      const mockCronJob = createCronJob('history-limit', 'default')
      mockCronJob.spec!.successfulJobsHistoryLimit = 5
      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })

      const result = await service.GetOneByNsName('default', 'history-limit')

      expect(result.spec?.successfulJobsHistoryLimit).toBe(5)
    })

    it('should handle cronjob with failedJobsHistoryLimit', async () => {
      const mockCronJob = createCronJob('failed-limit', 'default')
      mockCronJob.spec!.failedJobsHistoryLimit = 3
      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })

      const result = await service.GetOneByNsName('default', 'failed-limit')

      expect(result.spec?.failedJobsHistoryLimit).toBe(3)
    })

    it('should handle cronjob with starting deadline seconds', async () => {
      const mockCronJob = createCronJob('deadline-job', 'default')
      mockCronJob.spec!.startingDeadlineSeconds = 300
      mockK8sApi.readNamespacedCronJob.mockResolvedValue({
        body: mockCronJob,
      })

      const result = await service.GetOneByNsName('default', 'deadline-job')

      expect(result.spec?.startingDeadlineSeconds).toBe(300)
    })

    it('should handle empty namespace correctly', async () => {
      const mockCronJobs = [createCronJob('cronjob-1')]
      mockK8sApi.listCronJobForAllNamespaces.mockResolvedValue({
        body: { items: mockCronJobs },
      })

      const result = await service.List('')

      expect(result).toEqual(mockCronJobs)
      expect(mockK8sApi.listCronJobForAllNamespaces).toHaveBeenCalled()
    })

    it('should handle undefined namespace correctly', async () => {
      const mockCronJobs = [createCronJob('cronjob-1')]
      mockK8sApi.listCronJobForAllNamespaces.mockResolvedValue({
        body: { items: mockCronJobs },
      })

      const result = await service.List(undefined)

      expect(result).toEqual(mockCronJobs)
      expect(mockK8sApi.listCronJobForAllNamespaces).toHaveBeenCalled()
    })
  })
})
