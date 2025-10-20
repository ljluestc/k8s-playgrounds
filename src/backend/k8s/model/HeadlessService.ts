// Headless Service model definitions

/**
 * Headless Service Configuration
 *
 * A Headless Service is a service with ClusterIP set to "None".
 * This allows for direct pod-to-pod communication without load balancing.
 *
 * Key features:
 * - No ClusterIP assigned
 * - Direct DNS resolution to pod IPs
 * - Used with StatefulSets for stable network identities
 * - Enables service discovery mechanisms
 */
export interface HeadlessServiceConfig {
  name: string
  namespace?: string
  labels?: Record<string, string>
  selector: Record<string, string>
  ports: HeadlessServicePort[]
  annotations?: Record<string, string>
}

export interface HeadlessServicePort {
  name: string
  port: number
  targetPort: number | string
  protocol?: 'TCP' | 'UDP' | 'SCTP'
}

/**
 * Headless Service DNS Resolution
 *
 * DNS resolution for Headless Services works differently:
 * - Service DNS returns all pod IPs (A records)
 * - Individual pod DNS: <pod-name>.<service-name>.<namespace>.svc.cluster.local
 * - Enables direct pod-to-pod communication
 */
export interface HeadlessServiceDNS {
  serviceName: string
  namespace: string
  podIPs: string[]
  individualPodDNS: PodDNSRecord[]
}

export interface PodDNSRecord {
  podName: string
  podIP: string
  dnsName: string
}

/**
 * Endpoint Management for Headless Services
 *
 * Headless Services with selectors automatically create Endpoints.
 * Each endpoint represents a pod that matches the selector.
 */
export interface HeadlessServiceEndpoint {
  podName: string
  podIP: string
  ports: EndpointPort[]
  ready: boolean
  nodeName?: string
}

export interface EndpointPort {
  name: string
  port: number
  protocol: string
}

/**
 * StatefulSet Integration
 *
 * Headless Services are commonly used with StatefulSets to provide:
 * - Stable network identities for each pod
 * - Ordered deployment and scaling
 * - Persistent storage per pod
 */
export interface StatefulSetHeadlessConfig {
  serviceName: string
  replicas: number
  podTemplate: PodTemplate
  volumeClaimTemplates?: VolumeClaimTemplate[]
}

export interface PodTemplate {
  labels: Record<string, string>
  containers: ContainerSpec[]
  volumes?: VolumeSpec[]
}

export interface ContainerSpec {
  name: string
  image: string
  ports: ContainerPort[]
  env?: EnvVar[]
  resources?: ResourceRequirements
}

export interface ContainerPort {
  name: string
  containerPort: number
  protocol?: string
}

export interface EnvVar {
  name: string
  value: string
}

export interface ResourceRequirements {
  requests?: Record<string, string>
  limits?: Record<string, string>
}

export interface VolumeSpec {
  name: string
  persistentVolumeClaim?: {
    claimName: string
  }
}

export interface VolumeClaimTemplate {
  metadata: {
    name: string
  }
  spec: {
    accessModes: string[]
    resources: {
      requests: {
        storage: string
      }
    }
  }
}

/**
 * Service Discovery for Headless Services
 *
 * Headless Services enable various service discovery patterns:
 * - DNS-based discovery
 * - API-based discovery
 * - Custom discovery mechanisms
 */
export interface ServiceDiscoveryConfig {
  discoveryType: 'dns' | 'api' | 'custom'
  dnsServer?: string
  customDiscoveryEndpoint?: string
  refreshInterval?: number
}

export interface DiscoveredService {
  serviceName: string
  namespace: string
  endpoints: HeadlessServiceEndpoint[]
  lastUpdated: Date
}

/**
 * iptables Proxy Mode Configuration
 *
 * In iptables mode, kube-proxy installs iptables rules to:
 * - Capture traffic to Service ClusterIP
 * - Redirect to backend pods
 * - Load balance across endpoints
 */
export interface IptablesProxyConfig {
  serviceName: string
  clusterIP: string
  ports: ServicePort[]
  endpoints: string[]
  loadBalancingAlgorithm: 'random' | 'round-robin' | 'least-connections'
}

export interface ServicePort {
  name: string
  port: number
  targetPort: number
  protocol: string
}
