// Package v1alpha1 contains API Schema definitions for the k8s-playgrounds v1alpha1 API group
//+kubebuilder:object:generate=true
//+groupName=k8s-playgrounds.io
package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/intstr"
)

// K8sPlaygroundsClusterSpec defines the desired state of K8sPlaygroundsCluster
type K8sPlaygroundsClusterSpec struct {
	// Version specifies the version of the cluster
	// +kubebuilder:validation:Required
	Version string `json:"version"`

	// Replicas specifies the number of replicas for the cluster
	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:default=3
	Replicas int32 `json:"replicas,omitempty"`

	// Services defines the services to be managed by the cluster
	Services []ServiceSpec `json:"services,omitempty"`

	// HeadlessServices defines the headless services configuration
	HeadlessServices []HeadlessServiceSpec `json:"headlessServices,omitempty"`

	// StatefulSets defines the stateful sets configuration
	StatefulSets []StatefulSetSpec `json:"statefulSets,omitempty"`

	// Deployments defines the deployments configuration
	Deployments []DeploymentSpec `json:"deployments,omitempty"`

	// ConfigMaps defines the config maps configuration
	ConfigMaps []ConfigMapSpec `json:"configMaps,omitempty"`

	// Secrets defines the secrets configuration
	Secrets []SecretSpec `json:"secrets,omitempty"`

	// NetworkPolicies defines the network policies configuration
	NetworkPolicies []NetworkPolicySpec `json:"networkPolicies,omitempty"`

	// Ingresses defines the ingress configuration
	Ingresses []IngressSpec `json:"ingresses,omitempty"`

	// PersistentVolumes defines the persistent volumes configuration
	PersistentVolumes []PersistentVolumeSpec `json:"persistentVolumes,omitempty"`

	// Jobs defines the jobs configuration
	Jobs []JobSpec `json:"jobs,omitempty"`

	// CronJobs defines the cron jobs configuration
	CronJobs []CronJobSpec `json:"cronJobs,omitempty"`

	// DaemonSets defines the daemon sets configuration
	DaemonSets []DaemonSetSpec `json:"daemonSets,omitempty"`

	// ReplicaSets defines the replica sets configuration
	ReplicaSets []ReplicaSetSpec `json:"replicaSets,omitempty"`

	// HorizontalPodAutoscalers defines the HPA configuration
	HorizontalPodAutoscalers []HorizontalPodAutoscalerSpec `json:"horizontalPodAutoscalers,omitempty"`

	// Monitoring defines the monitoring configuration
	Monitoring *MonitoringSpec `json:"monitoring,omitempty"`

	// Security defines the security configuration
	Security *SecuritySpec `json:"security,omitempty"`

	// Backup defines the backup configuration
	Backup *BackupSpec `json:"backup,omitempty"`

	// AutoHealing defines the auto-healing configuration
	AutoHealing *AutoHealingSpec `json:"autoHealing,omitempty"`

	// Performance defines the performance configuration
	Performance *PerformanceSpec `json:"performance,omitempty"`
}

// K8sPlaygroundsClusterStatus defines the observed state of K8sPlaygroundsCluster
type K8sPlaygroundsClusterStatus struct {
	// Phase represents the current phase of cluster operation
	Phase ClusterPhase `json:"phase,omitempty"`

	// Conditions represent the latest available observations of the cluster's state
	Conditions []ClusterCondition `json:"conditions,omitempty"`

	// ReadyReplicas is the number of ready replicas
	ReadyReplicas int32 `json:"readyReplicas,omitempty"`

	// TotalReplicas is the total number of replicas
	TotalReplicas int32 `json:"totalReplicas,omitempty"`

	// ServiceStatuses represents the status of individual services
	ServiceStatuses []ServiceStatus `json:"serviceStatuses,omitempty"`

	// HeadlessServiceStatuses represents the status of headless services
	HeadlessServiceStatuses []HeadlessServiceStatus `json:"headlessServiceStatuses,omitempty"`

	// StatefulSetStatuses represents the status of stateful sets
	StatefulSetStatuses []StatefulSetStatus `json:"statefulSetStatuses,omitempty"`

	// LastUpdated represents the last time the status was updated
	LastUpdated metav1.Time `json:"lastUpdated,omitempty"`

	// Version represents the current version of the cluster
	Version string `json:"version,omitempty"`

	// Health represents the overall health of the cluster
	Health ClusterHealth `json:"health,omitempty"`
}

// ClusterPhase represents the phase of a cluster
type ClusterPhase string

const (
	ClusterPhasePending   ClusterPhase = "Pending"
	ClusterPhaseRunning   ClusterPhase = "Running"
	ClusterPhaseUpdating  ClusterPhase = "Updating"
	ClusterPhaseScaling   ClusterPhase = "Scaling"
	ClusterPhaseFailed    ClusterPhase = "Failed"
	ClusterPhaseDeleting  ClusterPhase = "Deleting"
	ClusterPhaseUnknown   ClusterPhase = "Unknown"
)

// ClusterHealth represents the health status of a cluster
type ClusterHealth string

const (
	ClusterHealthHealthy   ClusterHealth = "Healthy"
	ClusterHealthDegraded  ClusterHealth = "Degraded"
	ClusterHealthUnhealthy ClusterHealth = "Unhealthy"
	ClusterHealthUnknown   ClusterHealth = "Unknown"
)

// ClusterCondition represents a condition of a cluster
type ClusterCondition struct {
	Type               ClusterConditionType `json:"type"`
	Status             metav1.ConditionStatus `json:"status"`
	LastTransitionTime metav1.Time           `json:"lastTransitionTime,omitempty"`
	Reason             string                `json:"reason,omitempty"`
	Message            string                `json:"message,omitempty"`
}

// ClusterConditionType represents the type of a cluster condition
type ClusterConditionType string

const (
	ClusterConditionReady           ClusterConditionType = "Ready"
	ClusterConditionHealthy         ClusterConditionType = "Healthy"
	ClusterConditionScaling         ClusterConditionType = "Scaling"
	ClusterConditionUpdating        ClusterConditionType = "Updating"
	ClusterConditionBackupEnabled   ClusterConditionType = "BackupEnabled"
	ClusterConditionMonitoringReady ClusterConditionType = "MonitoringReady"
)

// ServiceSpec defines the specification for a service
type ServiceSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Selector    map[string]string `json:"selector"`
	Ports       []ServicePort     `json:"ports"`
	Type        string            `json:"type,omitempty"`
}

// ServicePort defines a port for a service
type ServicePort struct {
	Name       string             `json:"name,omitempty"`
	Port       int32              `json:"port"`
	TargetPort intstr.IntOrString `json:"targetPort"`
	Protocol   string             `json:"protocol,omitempty"`
	NodePort   int32              `json:"nodePort,omitempty"`
}

// HeadlessServiceSpec defines the specification for a headless service
type HeadlessServiceSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Selector    map[string]string `json:"selector"`
	Ports       []ServicePort     `json:"ports"`
	
	// DNS configuration
	DNS *DNSSpec `json:"dns,omitempty"`
	
	// Service discovery configuration
	ServiceDiscovery *ServiceDiscoverySpec `json:"serviceDiscovery,omitempty"`
	
	// iptables proxy configuration
	IptablesProxy *IptablesProxySpec `json:"iptablesProxy,omitempty"`
}

// DNSSpec defines DNS configuration for headless services
type DNSSpec struct {
	ClusterDomain string `json:"clusterDomain,omitempty"`
	DNSServer     string `json:"dnsServer,omitempty"`
	TTL           int32  `json:"ttl,omitempty"`
}

// ServiceDiscoverySpec defines service discovery configuration
type ServiceDiscoverySpec struct {
	Type            string            `json:"type"` // dns, api, custom
	RefreshInterval int32             `json:"refreshInterval,omitempty"`
	CustomEndpoint  string            `json:"customEndpoint,omitempty"`
	Config          map[string]string `json:"config,omitempty"`
}

// IptablesProxySpec defines iptables proxy configuration
type IptablesProxySpec struct {
	Enabled                bool   `json:"enabled"`
	LoadBalancingAlgorithm string `json:"loadBalancingAlgorithm,omitempty"` // random, round-robin, least-connections
	SessionAffinity        bool   `json:"sessionAffinity,omitempty"`
}

// StatefulSetSpec defines the specification for a stateful set
type StatefulSetSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Replicas    int32             `json:"replicas"`
	Selector    map[string]string `json:"selector"`
	Template    PodTemplateSpec   `json:"template"`
	
	// Headless service name for stable network identities
	ServiceName string `json:"serviceName,omitempty"`
	
	// Volume claim templates
	VolumeClaimTemplates []PersistentVolumeClaimTemplate `json:"volumeClaimTemplates,omitempty"`
	
	// Update strategy
	UpdateStrategy string `json:"updateStrategy,omitempty"`
	
	// Pod management policy
	PodManagementPolicy string `json:"podManagementPolicy,omitempty"`
}

// PodTemplateSpec defines the pod template
type PodTemplateSpec struct {
	Metadata metav1.ObjectMeta `json:"metadata,omitempty"`
	Spec     PodSpec           `json:"spec"`
}

// PodSpec defines the pod specification
type PodSpec struct {
	Containers     []ContainerSpec `json:"containers"`
	Volumes        []VolumeSpec    `json:"volumes,omitempty"`
	RestartPolicy  string          `json:"restartPolicy,omitempty"`
	NodeSelector   map[string]string `json:"nodeSelector,omitempty"`
	Tolerations    []TolerationSpec `json:"tolerations,omitempty"`
	Affinity       *AffinitySpec    `json:"affinity,omitempty"`
	SecurityContext *SecurityContextSpec `json:"securityContext,omitempty"`
}

// ContainerSpec defines a container specification
type ContainerSpec struct {
	Name            string                 `json:"name"`
	Image           string                 `json:"image"`
	ImagePullPolicy string                 `json:"imagePullPolicy,omitempty"`
	Ports           []ContainerPort        `json:"ports,omitempty"`
	Env             []EnvVar               `json:"env,omitempty"`
	Resources       *ResourceRequirements  `json:"resources,omitempty"`
	LivenessProbe   *ProbeSpec             `json:"livenessProbe,omitempty"`
	ReadinessProbe  *ProbeSpec             `json:"readinessProbe,omitempty"`
	VolumeMounts    []VolumeMountSpec      `json:"volumeMounts,omitempty"`
	Command         []string               `json:"command,omitempty"`
	Args            []string               `json:"args,omitempty"`
}

// ContainerPort defines a container port
type ContainerPort struct {
	Name          string `json:"name,omitempty"`
	ContainerPort int32  `json:"containerPort"`
	Protocol      string `json:"protocol,omitempty"`
	HostPort      int32  `json:"hostPort,omitempty"`
}

// EnvVar defines an environment variable
type EnvVar struct {
	Name      string        `json:"name"`
	Value     string        `json:"value,omitempty"`
	ValueFrom *EnvVarSource `json:"valueFrom,omitempty"`
}

// EnvVarSource defines the source of an environment variable
type EnvVarSource struct {
	FieldRef         *ObjectFieldSelector `json:"fieldRef,omitempty"`
	ResourceFieldRef *ResourceFieldSelector `json:"resourceFieldRef,omitempty"`
	ConfigMapKeyRef  *ConfigMapKeySelector `json:"configMapKeyRef,omitempty"`
	SecretKeyRef     *SecretKeySelector   `json:"secretKeyRef,omitempty"`
}

// ObjectFieldSelector defines a field selector for an object
type ObjectFieldSelector struct {
	APIVersion string `json:"apiVersion,omitempty"`
	FieldPath  string `json:"fieldPath"`
}

// ResourceFieldSelector defines a resource field selector
type ResourceFieldSelector struct {
	ContainerName string `json:"containerName,omitempty"`
	Resource      string `json:"resource"`
	Divisor       string `json:"divisor,omitempty"`
}

// ConfigMapKeySelector defines a config map key selector
type ConfigMapKeySelector struct {
	Name string `json:"name"`
	Key  string `json:"key"`
}

// SecretKeySelector defines a secret key selector
type SecretKeySelector struct {
	Name string `json:"name"`
	Key  string `json:"key"`
}

// ResourceRequirements defines resource requirements
type ResourceRequirements struct {
	Limits   map[string]string `json:"limits,omitempty"`
	Requests map[string]string `json:"requests,omitempty"`
}

// ProbeSpec defines a probe specification
type ProbeSpec struct {
	HTTPGet             *HTTPGetAction      `json:"httpGet,omitempty"`
	TCPSocket           *TCPSocketAction    `json:"tcpSocket,omitempty"`
	Exec                *ExecAction         `json:"exec,omitempty"`
	InitialDelaySeconds int32               `json:"initialDelaySeconds,omitempty"`
	TimeoutSeconds      int32               `json:"timeoutSeconds,omitempty"`
	PeriodSeconds       int32               `json:"periodSeconds,omitempty"`
	SuccessThreshold    int32               `json:"successThreshold,omitempty"`
	FailureThreshold    int32               `json:"failureThreshold,omitempty"`
}

// HTTPGetAction defines an HTTP GET action
type HTTPGetAction struct {
	Path        string             `json:"path,omitempty"`
	Port        intstr.IntOrString `json:"port"`
	Host        string             `json:"host,omitempty"`
	Scheme      string             `json:"scheme,omitempty"`
	HTTPHeaders []HTTPHeader       `json:"httpHeaders,omitempty"`
}

// HTTPHeader defines an HTTP header
type HTTPHeader struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// TCPSocketAction defines a TCP socket action
type TCPSocketAction struct {
	Port intstr.IntOrString `json:"port"`
	Host string             `json:"host,omitempty"`
}

// ExecAction defines an exec action
type ExecAction struct {
	Command []string `json:"command,omitempty"`
}

// VolumeMountSpec defines a volume mount specification
type VolumeMountSpec struct {
	Name      string `json:"name"`
	MountPath string `json:"mountPath"`
	ReadOnly  bool   `json:"readOnly,omitempty"`
	SubPath   string `json:"subPath,omitempty"`
}

// VolumeSpec defines a volume specification
type VolumeSpec struct {
	Name         string                 `json:"name"`
	VolumeSource VolumeSourceSpec       `json:"volumeSource"`
}

// VolumeSourceSpec defines a volume source specification
type VolumeSourceSpec struct {
	EmptyDir             *EmptyDirVolumeSource             `json:"emptyDir,omitempty"`
	HostPath             *HostPathVolumeSource             `json:"hostPath,omitempty"`
	PersistentVolumeClaim *PersistentVolumeClaimVolumeSource `json:"persistentVolumeClaim,omitempty"`
	ConfigMap            *ConfigMapVolumeSource            `json:"configMap,omitempty"`
	Secret               *SecretVolumeSource               `json:"secret,omitempty"`
}

// EmptyDirVolumeSource defines an empty directory volume source
type EmptyDirVolumeSource struct {
	Medium    string             `json:"medium,omitempty"`
	SizeLimit *ResourceQuantity  `json:"sizeLimit,omitempty"`
}

// HostPathVolumeSource defines a host path volume source
type HostPathVolumeSource struct {
	Path string `json:"path"`
	Type string `json:"type,omitempty"`
}

// PersistentVolumeClaimVolumeSource defines a PVC volume source
type PersistentVolumeClaimVolumeSource struct {
	ClaimName string `json:"claimName"`
	ReadOnly  bool   `json:"readOnly,omitempty"`
}

// ConfigMapVolumeSource defines a config map volume source
type ConfigMapVolumeSource struct {
	Name     string                `json:"name"`
	Items    []KeyToPath           `json:"items,omitempty"`
	DefaultMode *int32             `json:"defaultMode,omitempty"`
	Optional *bool                 `json:"optional,omitempty"`
}

// SecretVolumeSource defines a secret volume source
type SecretVolumeSource struct {
	SecretName  string                `json:"secretName"`
	Items       []KeyToPath           `json:"items,omitempty"`
	DefaultMode *int32                `json:"defaultMode,omitempty"`
	Optional    *bool                 `json:"optional,omitempty"`
}

// KeyToPath defines a key to path mapping
type KeyToPath struct {
	Key  string `json:"key"`
	Path string `json:"path"`
	Mode *int32 `json:"mode,omitempty"`
}

// ResourceQuantity defines a resource quantity
type ResourceQuantity struct {
	Format string `json:"format"`
	Value  string `json:"value"`
}

// TolerationSpec defines a toleration specification
type TolerationSpec struct {
	Key      string `json:"key,omitempty"`
	Operator string `json:"operator,omitempty"`
	Value    string `json:"value,omitempty"`
	Effect   string `json:"effect,omitempty"`
	TolerationSeconds *int64 `json:"tolerationSeconds,omitempty"`
}

// AffinitySpec defines affinity specification
type AffinitySpec struct {
	NodeAffinity    *NodeAffinitySpec    `json:"nodeAffinity,omitempty"`
	PodAffinity     *PodAffinitySpec     `json:"podAffinity,omitempty"`
	PodAntiAffinity *PodAntiAffinitySpec `json:"podAntiAffinity,omitempty"`
}

// NodeAffinitySpec defines node affinity specification
type NodeAffinitySpec struct {
	RequiredDuringSchedulingIgnoredDuringExecution *NodeSelectorSpec `json:"requiredDuringSchedulingIgnoredDuringExecution,omitempty"`
	PreferredDuringSchedulingIgnoredDuringExecution []PreferredSchedulingTerm `json:"preferredDuringSchedulingIgnoredDuringExecution,omitempty"`
}

// NodeSelectorSpec defines a node selector specification
type NodeSelectorSpec struct {
	NodeSelectorTerms []NodeSelectorTerm `json:"nodeSelectorTerms"`
}

// NodeSelectorTerm defines a node selector term
type NodeSelectorTerm struct {
	MatchExpressions []NodeSelectorRequirement `json:"matchExpressions,omitempty"`
	MatchFields      []NodeSelectorRequirement `json:"matchFields,omitempty"`
}

// NodeSelectorRequirement defines a node selector requirement
type NodeSelectorRequirement struct {
	Key      string   `json:"key"`
	Operator string   `json:"operator"`
	Values   []string `json:"values,omitempty"`
}

// PreferredSchedulingTerm defines a preferred scheduling term
type PreferredSchedulingTerm struct {
	Weight     int32               `json:"weight"`
	Preference NodeSelectorTerm    `json:"preference"`
}

// PodAffinitySpec defines pod affinity specification
type PodAffinitySpec struct {
	RequiredDuringSchedulingIgnoredDuringExecution  []PodAffinityTerm `json:"requiredDuringSchedulingIgnoredDuringExecution,omitempty"`
	PreferredDuringSchedulingIgnoredDuringExecution []WeightedPodAffinityTerm `json:"preferredDuringSchedulingIgnoredDuringExecution,omitempty"`
}

// PodAntiAffinitySpec defines pod anti-affinity specification
type PodAntiAffinitySpec struct {
	RequiredDuringSchedulingIgnoredDuringExecution  []PodAffinityTerm `json:"requiredDuringSchedulingIgnoredDuringExecution,omitempty"`
	PreferredDuringSchedulingIgnoredDuringExecution []WeightedPodAffinityTerm `json:"preferredDuringSchedulingIgnoredDuringExecution,omitempty"`
}

// PodAffinityTerm defines a pod affinity term
type PodAffinityTerm struct {
	LabelSelector *LabelSelectorSpec `json:"labelSelector,omitempty"`
	Namespaces    []string           `json:"namespaces,omitempty"`
	TopologyKey   string             `json:"topologyKey"`
}

// WeightedPodAffinityTerm defines a weighted pod affinity term
type WeightedPodAffinityTerm struct {
	Weight          int32            `json:"weight"`
	PodAffinityTerm PodAffinityTerm  `json:"podAffinityTerm"`
}

// LabelSelectorSpec defines a label selector specification
type LabelSelectorSpec struct {
	MatchLabels      map[string]string           `json:"matchLabels,omitempty"`
	MatchExpressions []LabelSelectorRequirement  `json:"matchExpressions,omitempty"`
}

// LabelSelectorRequirement defines a label selector requirement
type LabelSelectorRequirement struct {
	Key      string   `json:"key"`
	Operator string   `json:"operator"`
	Values   []string `json:"values,omitempty"`
}

// SecurityContextSpec defines security context specification
type SecurityContextSpec struct {
	RunAsUser                *int64  `json:"runAsUser,omitempty"`
	RunAsGroup               *int64  `json:"runAsGroup,omitempty"`
	RunAsNonRoot             *bool   `json:"runAsNonRoot,omitempty"`
	ReadOnlyRootFilesystem   *bool   `json:"readOnlyRootFilesystem,omitempty"`
	AllowPrivilegeEscalation *bool   `json:"allowPrivilegeEscalation,omitempty"`
	Privileged               *bool   `json:"privileged,omitempty"`
	FSGroup                  *int64  `json:"fsGroup,omitempty"`
}

// PersistentVolumeClaimTemplate defines a PVC template
type PersistentVolumeClaimTemplate struct {
	Metadata metav1.ObjectMeta `json:"metadata,omitempty"`
	Spec     PersistentVolumeClaimSpec `json:"spec"`
}

// PersistentVolumeClaimSpec defines a PVC specification
type PersistentVolumeClaimSpec struct {
	AccessModes []string `json:"accessModes"`
	Resources   ResourceRequirements `json:"resources"`
	StorageClassName string `json:"storageClassName,omitempty"`
	VolumeName  string `json:"volumeName,omitempty"`
}

// Additional specs for other resource types...
type DeploymentSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Replicas    int32             `json:"replicas"`
	Selector    map[string]string `json:"selector"`
	Template    PodTemplateSpec   `json:"template"`
	Strategy    string            `json:"strategy,omitempty"`
}

type ConfigMapSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Data        map[string]string `json:"data,omitempty"`
	BinaryData  map[string][]byte `json:"binaryData,omitempty"`
}

type SecretSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Type        string            `json:"type,omitempty"`
	Data        map[string][]byte `json:"data,omitempty"`
	StringData  map[string]string `json:"stringData,omitempty"`
}

type NetworkPolicySpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	PodSelector map[string]string `json:"podSelector,omitempty"`
	PolicyTypes []string          `json:"policyTypes,omitempty"`
	Ingress     []NetworkPolicyIngressRule `json:"ingress,omitempty"`
	Egress      []NetworkPolicyEgressRule  `json:"egress,omitempty"`
}

type NetworkPolicyIngressRule struct {
	From  []NetworkPolicyPeer `json:"from,omitempty"`
	Ports []NetworkPolicyPort `json:"ports,omitempty"`
}

type NetworkPolicyEgressRule struct {
	To    []NetworkPolicyPeer `json:"to,omitempty"`
	Ports []NetworkPolicyPort `json:"ports,omitempty"`
}

type NetworkPolicyPeer struct {
	PodSelector       *LabelSelectorSpec `json:"podSelector,omitempty"`
	NamespaceSelector *LabelSelectorSpec `json:"namespaceSelector,omitempty"`
	IPBlock           *IPBlockSpec       `json:"ipBlock,omitempty"`
}

type NetworkPolicyPort struct {
	Protocol string             `json:"protocol,omitempty"`
	Port     *intstr.IntOrString `json:"port,omitempty"`
}

type IPBlockSpec struct {
	CIDR   string   `json:"cidr"`
	Except []string `json:"except,omitempty"`
}

type IngressSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Rules       []IngressRule     `json:"rules,omitempty"`
	TLS         []IngressTLS      `json:"tls,omitempty"`
}

type IngressRule struct {
	Host string        `json:"host,omitempty"`
	HTTP *HTTPIngressRuleValue `json:"http,omitempty"`
}

type HTTPIngressRuleValue struct {
	Paths []HTTPIngressPath `json:"paths"`
}

type HTTPIngressPath struct {
	Path     string             `json:"path"`
	PathType string             `json:"pathType,omitempty"`
	Backend  IngressBackend     `json:"backend"`
}

type IngressBackend struct {
	ServiceName string             `json:"serviceName"`
	ServicePort intstr.IntOrString `json:"servicePort"`
}

type IngressTLS struct {
	Hosts      []string `json:"hosts,omitempty"`
	SecretName string   `json:"secretName,omitempty"`
}

type PersistentVolumeSpec struct {
	Name        string            `json:"name"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Capacity    map[string]string `json:"capacity,omitempty"`
	AccessModes []string          `json:"accessModes,omitempty"`
	StorageClassName string       `json:"storageClassName,omitempty"`
	PersistentVolumeSource PersistentVolumeSourceSpec `json:"persistentVolumeSource"`
}

type PersistentVolumeSourceSpec struct {
	HostPath *HostPathVolumeSource `json:"hostPath,omitempty"`
	NFS      *NFSVolumeSource      `json:"nfs,omitempty"`
	AWSElasticBlockStore *AWSElasticBlockStoreVolumeSource `json:"awsElasticBlockStore,omitempty"`
	GCEPersistentDisk *GCEPersistentDiskVolumeSource `json:"gcePersistentDisk,omitempty"`
}

type NFSVolumeSource struct {
	Server   string `json:"server"`
	Path     string `json:"path"`
	ReadOnly bool   `json:"readOnly,omitempty"`
}

type AWSElasticBlockStoreVolumeSource struct {
	VolumeID  string `json:"volumeID"`
	FSType    string `json:"fsType,omitempty"`
	Partition int32  `json:"partition,omitempty"`
	ReadOnly  bool   `json:"readOnly,omitempty"`
}

type GCEPersistentDiskVolumeSource struct {
	PDName   string `json:"pdName"`
	FSType   string `json:"fsType,omitempty"`
	Partition int32 `json:"partition,omitempty"`
	ReadOnly bool   `json:"readOnly,omitempty"`
}

type JobSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Template    PodTemplateSpec   `json:"template"`
	Parallelism *int32            `json:"parallelism,omitempty"`
	Completions *int32            `json:"completions,omitempty"`
	BackoffLimit *int32           `json:"backoffLimit,omitempty"`
	ActiveDeadlineSeconds *int64  `json:"activeDeadlineSeconds,omitempty"`
}

type CronJobSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Schedule    string            `json:"scheme"`
	JobTemplate JobSpec           `json:"jobTemplate"`
	Suspend     *bool             `json:"suspend,omitempty"`
	ConcurrencyPolicy string      `json:"concurrencyPolicy,omitempty"`
	SuccessfulJobsHistoryLimit *int32 `json:"successfulJobsHistoryLimit,omitempty"`
	FailedJobsHistoryLimit    *int32 `json:"failedJobsHistoryLimit,omitempty"`
}

type DaemonSetSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Selector    map[string]string `json:"selector"`
	Template    PodTemplateSpec   `json:"template"`
	UpdateStrategy string         `json:"updateStrategy,omitempty"`
}

type ReplicaSetSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	Replicas    int32             `json:"replicas"`
	Selector    map[string]string `json:"selector"`
	Template    PodTemplateSpec   `json:"template"`
}

type HorizontalPodAutoscalerSpec struct {
	Name        string            `json:"name"`
	Namespace   string            `json:"namespace,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
	ScaleTargetRef ScaleTargetRef `json:"scaleTargetRef"`
	MinReplicas *int32            `json:"minReplicas,omitempty"`
	MaxReplicas int32             `json:"maxReplicas"`
	Metrics     []MetricSpec      `json:"metrics,omitempty"`
}

type ScaleTargetRef struct {
	APIVersion string `json:"apiVersion,omitempty"`
	Kind       string `json:"kind"`
	Name       string `json:"name"`
}

type MetricSpec struct {
	Type     string            `json:"type"`
	Resource *ResourceMetricSpec `json:"resource,omitempty"`
	Pods     *PodsMetricSpec   `json:"pods,omitempty"`
	Object   *ObjectMetricSpec `json:"object,omitempty"`
}

type ResourceMetricSpec struct {
	Name   string `json:"name"`
	Target MetricTarget `json:"target"`
}

type PodsMetricSpec struct {
	Metric MetricIdentifier `json:"metric"`
	Target MetricTarget     `json:"target"`
}

type ObjectMetricSpec struct {
	Metric  MetricIdentifier `json:"metric"`
	Target  MetricTarget     `json:"target"`
	DescribedObject CrossVersionObjectReference `json:"describedObject"`
}

type MetricIdentifier struct {
	Name string            `json:"name"`
	Selector *LabelSelectorSpec `json:"selector,omitempty"`
}

type MetricTarget struct {
	Type         string `json:"type"`
	Value        *int32 `json:"value,omitempty"`
	AverageValue *int32 `json:"averageValue,omitempty"`
}

type CrossVersionObjectReference struct {
	APIVersion string `json:"apiVersion,omitempty"`
	Kind       string `json:"kind"`
	Name       string `json:"name"`
}

// Monitoring, Security, Backup, AutoHealing, and Performance specs
type MonitoringSpec struct {
	Enabled     bool              `json:"enabled"`
	Prometheus  *PrometheusSpec   `json:"prometheus,omitempty"`
	Grafana     *GrafanaSpec      `json:"grafana,omitempty"`
	AlertManager *AlertManagerSpec `json:"alertManager,omitempty"`
}

type PrometheusSpec struct {
	Enabled bool   `json:"enabled"`
	Image   string `json:"image,omitempty"`
	Port    int32  `json:"port,omitempty"`
}

type GrafanaSpec struct {
	Enabled bool   `json:"enabled"`
	Image   string `json:"image,omitempty"`
	Port    int32  `json:"port,omitempty"`
}

type AlertManagerSpec struct {
	Enabled bool   `json:"enabled"`
	Image   string `json:"image,omitempty"`
	Port    int32  `json:"port,omitempty"`
}

type SecuritySpec struct {
	Enabled           bool                `json:"enabled"`
	PodSecurityPolicy *PodSecurityPolicySpec `json:"podSecurityPolicy,omitempty"`
	NetworkPolicies   bool                `json:"networkPolicies,omitempty"`
	RBAC              *RBACSpec           `json:"rbac,omitempty"`
	SecretsManagement *SecretsManagementSpec `json:"secretsManagement,omitempty"`
}

type PodSecurityPolicySpec struct {
	Enabled bool `json:"enabled"`
}

type RBACSpec struct {
	Enabled bool `json:"enabled"`
}

type SecretsManagementSpec struct {
	Enabled bool   `json:"enabled"`
	Type    string `json:"type,omitempty"` // vault, sealed-secrets, etc.
}

type BackupSpec struct {
	Enabled  bool   `json:"enabled"`
	Schedule string `json:"schedule,omitempty"`
	Retention string `json:"retention,omitempty"`
	Storage  string `json:"storage,omitempty"`
}

type AutoHealingSpec struct {
	Enabled           bool `json:"enabled"`
	DeadNodeReplacement bool `json:"deadNodeReplacement,omitempty"`
	PodRestart        bool `json:"podRestart,omitempty"`
	ResourceScaling   bool `json:"resourceScaling,omitempty"`
}

type PerformanceSpec struct {
	Enabled           bool   `json:"enabled"`
	ResourceOptimization bool `json:"resourceOptimization,omitempty"`
	LoadBalancing     bool   `json:"loadBalancing,omitempty"`
	AutoScaling       bool   `json:"autoScaling,omitempty"`
}

// Status types
type ServiceStatus struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
	Phase     string `json:"phase,omitempty"`
	Ready     bool   `json:"ready,omitempty"`
	Message   string `json:"message,omitempty"`
}

type HeadlessServiceStatus struct {
	Name      string   `json:"name"`
	Namespace string   `json:"namespace,omitempty"`
	Phase     string   `json:"phase,omitempty"`
	Ready     bool     `json:"ready,omitempty"`
	Endpoints []string `json:"endpoints,omitempty"`
	DNS       *DNSTestResult `json:"dns,omitempty"`
	Message   string   `json:"message,omitempty"`
}

type StatefulSetStatus struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
	Phase     string `json:"phase,omitempty"`
	Ready     bool   `json:"ready,omitempty"`
	Replicas  int32  `json:"replicas,omitempty"`
	Message   string `json:"message,omitempty"`
}

type DNSTestResult struct {
	ServiceDNS        string            `json:"serviceDNS,omitempty"`
	ResolvedIPs       []string          `json:"resolvedIPs,omitempty"`
	IndividualPodDNS  []PodDNSRecord    `json:"individualPodDNS,omitempty"`
	Success           bool              `json:"success,omitempty"`
	ErrorMessage      string            `json:"errorMessage,omitempty"`
}

type PodDNSRecord struct {
	PodName   string `json:"podName,omitempty"`
	PodIP     string `json:"podIP,omitempty"`
	DNSName   string `json:"dnsName,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:printcolumn:name="Phase",type="string",JSONPath=".status.phase"
//+kubebuilder:printcolumn:name="Ready",type="integer",JSONPath=".status.readyReplicas"
//+kubebuilder:printcolumn:name="Total",type="integer",JSONPath=".status.totalReplicas"
//+kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// K8sPlaygroundsCluster is the Schema for the k8splaygroundsclusters API
type K8sPlaygroundsCluster struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   K8sPlaygroundsClusterSpec   `json:"spec,omitempty"`
	Status K8sPlaygroundsClusterStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// K8sPlaygroundsClusterList contains a list of K8sPlaygroundsCluster
type K8sPlaygroundsClusterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []K8sPlaygroundsCluster `json:"items"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Namespaced
//+kubebuilder:printcolumn:name="Phase",type="string",JSONPath=".status.phase"
//+kubebuilder:printcolumn:name="Ready",type="boolean",JSONPath=".status.ready"
//+kubebuilder:printcolumn:name="Endpoints",type="integer",JSONPath=".status.endpoints"
//+kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"

// HeadlessService is the Schema for the headlessservices API
type HeadlessService struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   HeadlessServiceSpec   `json:"spec,omitempty"`
	Status HeadlessServiceStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// HeadlessServiceList contains a list of HeadlessService
type HeadlessServiceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []HeadlessService `json:"items"`
}

func init() {
	SchemeBuilder.Register(&K8sPlaygroundsCluster{}, &K8sPlaygroundsClusterList{})
	SchemeBuilder.Register(&HeadlessService{}, &HeadlessServiceList{})
}
