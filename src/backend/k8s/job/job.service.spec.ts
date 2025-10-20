import { _vi } from 'vitest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ClientService } from '../client/client.service'
import { createJob, createMockClientService } from '../../../../test/utils/k8s-mocks'
import { JobService } from './job.service'

describe('JobService', () => {
  let service: JobService
  let clientService: any
  let mockK8sApi: any

  beforeEach(async () => {
    const mockClientService = createMockClientService()
    mockK8sApi = mockClientService.getBatchV1Api()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: JobService,
          useFactory: (clientService: ClientService) => {
            return new JobService(clientService)
          },
          inject: [ClientService],
        },
        {
          provide: ClientService,
          useValue: mockClientService,
        },
      ],
    }).compile()

    service = module.get<JobService>(JobService)
    clientService = mockClientService
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('List', () => {
    it('should list all jobs across all namespaces when no namespace specified', async () => {
      const mockJobs = [createJob('job-1', 'default'), createJob('job-2', 'kube-system')]
      mockK8sApi.listJobForAllNamespaces.mockResolvedValue({
        body: { items: mockJobs },
      })

      const result = await service.List()

      expect(result).toEqual(mockJobs)
      expect(mockK8sApi.listJobForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedJob).not.toHaveBeenCalled()
    })

    it('should list all jobs when namespace is "null" string', async () => {
      const mockJobs = [createJob('job-1')]
      mockK8sApi.listJobForAllNamespaces.mockResolvedValue({
        body: { items: mockJobs },
      })

      const result = await service.List('null')

      expect(result).toEqual(mockJobs)
      expect(mockK8sApi.listJobForAllNamespaces).toHaveBeenCalled()
      expect(mockK8sApi.listNamespacedJob).not.toHaveBeenCalled()
    })

    it('should list jobs in a specific namespace', async () => {
      const mockJobs = [createJob('job-1', 'default')]
      mockK8sApi.listNamespacedJob.mockResolvedValue({
        body: { items: mockJobs },
      })

      const result = await service.List('default')

      expect(result).toEqual(mockJobs)
      expect(mockK8sApi.listNamespacedJob).toHaveBeenCalledWith('default')
      expect(mockK8sApi.listJobForAllNamespaces).not.toHaveBeenCalled()
    })

    it('should handle API errors when listing all jobs', async () => {
      const error = new Error('API Error')
      mockK8sApi.listJobForAllNamespaces.mockRejectedValue(error)

      await expect(service.List()).rejects.toThrow('API Error')
    })

    it('should handle API errors when listing namespaced jobs', async () => {
      const error = new Error('Namespace not found')
      mockK8sApi.listNamespacedJob.mockRejectedValue(error)

      await expect(service.List('default')).rejects.toThrow('Namespace not found')
    })

    it('should return empty list when no jobs exist', async () => {
      mockK8sApi.listJobForAllNamespaces.mockResolvedValue({
        body: { items: [] },
      })

      const result = await service.List()

      expect(result).toEqual([])
    })

    it('should list jobs in kube-system namespace', async () => {
      const mockJobs = [createJob('system-job', 'kube-system')]
      mockK8sApi.listNamespacedJob.mockResolvedValue({
        body: { items: mockJobs },
      })

      const result = await service.List('kube-system')

      expect(result).toEqual(mockJobs)
      expect(mockK8sApi.listNamespacedJob).toHaveBeenCalledWith('kube-system')
    })

    it('should handle special namespace names', async () => {
      const mockJobs = [createJob('my-job', 'my-namespace-123')]
      mockK8sApi.listNamespacedJob.mockResolvedValue({
        body: { items: mockJobs },
      })

      const result = await service.List('my-namespace-123')

      expect(result).toEqual(mockJobs)
      expect(mockK8sApi.listNamespacedJob).toHaveBeenCalledWith('my-namespace-123')
    })

    it('should list completed jobs', async () => {
      const completedJob = createJob('completed-job', 'default')
      completedJob.status = { succeeded: 1, failed: 0 }
      mockK8sApi.listNamespacedJob.mockResolvedValue({
        body: { items: [completedJob] },
      })

      const result = await service.List('default')

      expect(result).toEqual([completedJob])
      expect(result[0].status?.succeeded).toBe(1)
    })

    it('should list failed jobs', async () => {
      const failedJob = createJob('failed-job', 'default')
      failedJob.status = { succeeded: 0, failed: 3 }
      mockK8sApi.listNamespacedJob.mockResolvedValue({
        body: { items: [failedJob] },
      })

      const result = await service.List('default')

      expect(result).toEqual([failedJob])
      expect(result[0].status?.failed).toBe(3)
    })

    it('should list running jobs', async () => {
      const runningJob = createJob('running-job', 'default')
      runningJob.status = { active: 2 }
      mockK8sApi.listNamespacedJob.mockResolvedValue({
        body: { items: [runningJob] },
      })

      const result = await service.List('default')

      expect(result).toEqual([runningJob])
      expect(result[0].status?.active).toBe(2)
    })

    it('should list jobs with mixed statuses', async () => {
      const jobs = [
        { ...createJob('completed-job', 'default'), status: { succeeded: 1 } },
        { ...createJob('failed-job', 'default'), status: { failed: 1 } },
        { ...createJob('running-job', 'default'), status: { active: 1 } },
      ]
      mockK8sApi.listNamespacedJob.mockResolvedValue({
        body: { items: jobs },
      })

      const result = await service.List('default')

      expect(result).toHaveLength(3)
      expect(result).toEqual(jobs)
    })
  })

  describe('GetOneByNsName', () => {
    it('should get a single job by namespace and name', async () => {
      const mockJob = createJob('test-job', 'default')
      mockK8sApi.readNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.GetOneByNsName('default', 'test-job')

      expect(result).toEqual(mockJob)
      expect(mockK8sApi.readNamespacedJob).toHaveBeenCalledWith('test-job', 'default')
    })

    it('should handle not found errors', async () => {
      const error = new Error('Job not found')
      mockK8sApi.readNamespacedJob.mockRejectedValue(error)

      await expect(service.GetOneByNsName('default', 'nonexistent')).rejects.toThrow('Job not found')
    })

    it('should handle invalid namespace', async () => {
      const error = new Error('Namespace does not exist')
      mockK8sApi.readNamespacedJob.mockRejectedValue(error)

      await expect(service.GetOneByNsName('invalid-ns', 'test-job')).rejects.toThrow('Namespace does not exist')
    })

    it('should get completed job', async () => {
      const mockJob = createJob('completed-job', 'default')
      mockJob.status = { succeeded: 1, failed: 0, completionTime: new Date().toISOString() as any }
      mockK8sApi.readNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.GetOneByNsName('default', 'completed-job')

      expect(result).toEqual(mockJob)
      expect(result.status?.succeeded).toBe(1)
      expect(result.status?.completionTime).toBeDefined()
    })

    it('should get failed job', async () => {
      const mockJob = createJob('failed-job', 'default')
      mockJob.status = { succeeded: 0, failed: 3 }
      mockK8sApi.readNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.GetOneByNsName('default', 'failed-job')

      expect(result).toEqual(mockJob)
      expect(result.status?.failed).toBe(3)
    })

    it('should get running job', async () => {
      const mockJob = createJob('running-job', 'default')
      mockJob.status = { active: 1, startTime: new Date().toISOString() as any }
      mockK8sApi.readNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.GetOneByNsName('default', 'running-job')

      expect(result).toEqual(mockJob)
      expect(result.status?.active).toBe(1)
      expect(result.status?.startTime).toBeDefined()
    })

    it('should get job with parallelism setting', async () => {
      const mockJob = createJob('parallel-job', 'default')
      mockJob.spec!.parallelism = 3
      mockK8sApi.readNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.GetOneByNsName('default', 'parallel-job')

      expect(result).toEqual(mockJob)
      expect(result.spec?.parallelism).toBe(3)
    })

    it('should get job with completion count', async () => {
      const mockJob = createJob('completion-job', 'default')
      mockJob.spec!.completions = 5
      mockK8sApi.readNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.GetOneByNsName('default', 'completion-job')

      expect(result).toEqual(mockJob)
      expect(result.spec?.completions).toBe(5)
    })

    it('should get job with backoff limit', async () => {
      const mockJob = createJob('backoff-job', 'default')
      mockJob.spec!.backoffLimit = 4
      mockK8sApi.readNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.GetOneByNsName('default', 'backoff-job')

      expect(result).toEqual(mockJob)
      expect(result.spec?.backoffLimit).toBe(4)
    })

    it('should handle job names with hyphens and numbers', async () => {
      const mockJob = createJob('my-job-123', 'default')
      mockK8sApi.readNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.GetOneByNsName('default', 'my-job-123')

      expect(result).toEqual(mockJob)
      expect(mockK8sApi.readNamespacedJob).toHaveBeenCalledWith('my-job-123', 'default')
    })

    it('should get job from kube-system namespace', async () => {
      const mockJob = createJob('system-job', 'kube-system')
      mockK8sApi.readNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.GetOneByNsName('kube-system', 'system-job')

      expect(result).toEqual(mockJob)
      expect(mockK8sApi.readNamespacedJob).toHaveBeenCalledWith('system-job', 'kube-system')
    })

    it('should get job with TTL setting', async () => {
      const mockJob = createJob('ttl-job', 'default')
      mockJob.spec!.ttlSecondsAfterFinished = 100
      mockK8sApi.readNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.GetOneByNsName('default', 'ttl-job')

      expect(result).toEqual(mockJob)
      expect(result.spec?.ttlSecondsAfterFinished).toBe(100)
    })
  })

  describe('Delete', () => {
    it('should delete a job', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('test-job', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedJob).toHaveBeenCalledWith('test-job', 'default')
    })

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed')
      mockK8sApi.deleteNamespacedJob.mockRejectedValue(error)

      await expect(service.Delete('test-job', 'default')).rejects.toThrow('Delete failed')
    })

    it('should handle deleting non-existent job', async () => {
      const error = new Error('Job not found')
      mockK8sApi.deleteNamespacedJob.mockRejectedValue(error)

      await expect(service.Delete('nonexistent', 'default')).rejects.toThrow('Job not found')
    })

    it('should delete job from specific namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('my-job', 'kube-system')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedJob).toHaveBeenCalledWith('my-job', 'kube-system')
    })

    it('should handle job with finalizers', async () => {
      const mockResponse = { status: 'Success', metadata: { finalizers: ['kubernetes'] } }
      mockK8sApi.deleteNamespacedJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('job-with-finalizer', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle graceful deletion', async () => {
      const mockResponse = { status: 'Success', metadata: { deletionTimestamp: new Date().toISOString() } }
      mockK8sApi.deleteNamespacedJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('graceful-delete', 'default')

      expect(result).toEqual(mockResponse)
    })

    it('should handle permission errors', async () => {
      const error = new Error('Forbidden: User cannot delete jobs')
      mockK8sApi.deleteNamespacedJob.mockRejectedValue(error)

      await expect(service.Delete('test-job', 'default')).rejects.toThrow('Forbidden')
    })

    it('should delete completed job', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('completed-job', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedJob).toHaveBeenCalledWith('completed-job', 'default')
    })

    it('should delete failed job', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('failed-job', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedJob).toHaveBeenCalledWith('failed-job', 'default')
    })

    it('should delete running job', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('running-job', 'default')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedJob).toHaveBeenCalledWith('running-job', 'default')
    })

    it('should handle job deletion from custom namespace', async () => {
      const mockResponse = { status: 'Success' }
      mockK8sApi.deleteNamespacedJob.mockResolvedValue({
        body: mockResponse,
      })

      const result = await service.Delete('custom-job', 'my-custom-namespace')

      expect(result).toEqual(mockResponse)
      expect(mockK8sApi.deleteNamespacedJob).toHaveBeenCalledWith('custom-job', 'my-custom-namespace')
    })
  })

  describe('Create', () => {
    it('should create a job', async () => {
      const mockJob = createJob('new-job', 'default')
      mockK8sApi.createNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.Create('default', mockJob)

      expect(result).toEqual(mockJob)
      expect(mockK8sApi.createNamespacedJob).toHaveBeenCalledWith('default', mockJob)
    })

    it('should handle creation errors', async () => {
      const mockJob = createJob('new-job', 'default')
      const error = new Error('Create failed')
      mockK8sApi.createNamespacedJob.mockRejectedValue(error)

      await expect(service.Create('default', mockJob)).rejects.toThrow('Create failed')
    })

    it('should create job in specific namespace', async () => {
      const mockJob = createJob('new-job', 'kube-system')
      mockK8sApi.createNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.Create('kube-system', mockJob)

      expect(result).toEqual(mockJob)
      expect(mockK8sApi.createNamespacedJob).toHaveBeenCalledWith('kube-system', mockJob)
    })

    it('should handle invalid namespace on creation', async () => {
      const mockJob = createJob('new-job', 'invalid')
      const error = new Error('Namespace does not exist')
      mockK8sApi.createNamespacedJob.mockRejectedValue(error)

      await expect(service.Create('invalid', mockJob)).rejects.toThrow('Namespace does not exist')
    })

    it('should create job with parallelism', async () => {
      const mockJob = createJob('parallel-job', 'default')
      mockJob.spec!.parallelism = 3
      mockK8sApi.createNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.Create('default', mockJob)

      expect(result).toEqual(mockJob)
      expect(result.spec?.parallelism).toBe(3)
    })

    it('should create job with completion count', async () => {
      const mockJob = createJob('completion-job', 'default')
      mockJob.spec!.completions = 5
      mockK8sApi.createNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.Create('default', mockJob)

      expect(result).toEqual(mockJob)
      expect(result.spec?.completions).toBe(5)
    })

    it('should create job with backoff limit', async () => {
      const mockJob = createJob('backoff-job', 'default')
      mockJob.spec!.backoffLimit = 4
      mockK8sApi.createNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.Create('default', mockJob)

      expect(result).toEqual(mockJob)
      expect(result.spec?.backoffLimit).toBe(4)
    })

    it('should create job with TTL setting', async () => {
      const mockJob = createJob('ttl-job', 'default')
      mockJob.spec!.ttlSecondsAfterFinished = 100
      mockK8sApi.createNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.Create('default', mockJob)

      expect(result).toEqual(mockJob)
      expect(result.spec?.ttlSecondsAfterFinished).toBe(100)
    })

    it('should handle permission errors on creation', async () => {
      const mockJob = createJob('new-job', 'default')
      const error = new Error('Forbidden: User cannot create jobs')
      mockK8sApi.createNamespacedJob.mockRejectedValue(error)

      await expect(service.Create('default', mockJob)).rejects.toThrow('Forbidden')
    })

    it('should handle duplicate job creation', async () => {
      const mockJob = createJob('existing-job', 'default')
      const error = new Error('Job already exists')
      mockK8sApi.createNamespacedJob.mockRejectedValue(error)

      await expect(service.Create('default', mockJob)).rejects.toThrow('Job already exists')
    })

    it('should create job in custom namespace', async () => {
      const mockJob = createJob('custom-job', 'my-namespace')
      mockK8sApi.createNamespacedJob.mockResolvedValue({
        body: mockJob,
      })

      const result = await service.Create('my-namespace', mockJob)

      expect(result).toEqual(mockJob)
      expect(mockK8sApi.createNamespacedJob).toHaveBeenCalledWith('my-namespace', mockJob)
    })
  })

  describe('Client Service Integration', () => {
    it('should use ClientService to get K8s API', async () => {
      const mockJobs = [createJob('test-job')]
      mockK8sApi.listJobForAllNamespaces.mockResolvedValue({
        body: { items: mockJobs },
      })

      await service.List()

      expect(clientService.getBatchV1Api).toHaveBeenCalled()
    })

    it('should call getBatchV1Api for every operation', async () => {
      const mockJob = createJob('test')
      mockK8sApi.listJobForAllNamespaces.mockResolvedValue({ body: { items: [] } })
      mockK8sApi.readNamespacedJob.mockResolvedValue({ body: mockJob })
      mockK8sApi.deleteNamespacedJob.mockResolvedValue({ body: { status: 'Success' } })
      mockK8sApi.createNamespacedJob.mockResolvedValue({ body: mockJob })

      await service.List()
      await service.GetOneByNsName('default', 'test')
      await service.Delete('test', 'default')
      await service.Create('default', mockJob)

      expect(clientService.getBatchV1Api).toHaveBeenCalledTimes(5)
    })

    it('should use BatchV1Api for job operations', async () => {
      const mockJobs = [createJob('test-job')]
      mockK8sApi.listJobForAllNamespaces.mockResolvedValue({
        body: { items: mockJobs },
      })

      await service.List()

      expect(clientService.getBatchV1Api).toHaveBeenCalled()
      expect(mockK8sApi.listJobForAllNamespaces).toHaveBeenCalled()
    })
  })
})
