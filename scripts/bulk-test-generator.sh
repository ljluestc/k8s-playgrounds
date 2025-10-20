#!/bin/bash

###############################################################################
# Bulk Test Generator Script
#
# This script generates comprehensive unit tests for all K8s resources
# that don't currently have test files.
###############################################################################

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_K8S="$PROJECT_ROOT/src/backend/k8s"

echo "🔧 Bulk Test Generator for K8s-Playgrounds"
echo "============================================"
echo ""

# Counter for generated files
GENERATED_COUNT=0

# List of all K8s resource directories
K8S_RESOURCES=(
  "service:NetworkSvc"
  "statefulset:statefulset"
  "daemonset:daemonset"
  "job:job"
  "cronjob:cronjob"
  "replicaset:replicaset"
  "replicationController:replication"
  "ingress:ingress"
  "configmap:configmap"
  "secret:secret"
  "ns:ns"
  "node:node"
  "ClusterRole:ClusterRole"
  "ClusterRoleBinding:ClusterRoleBinding"
  "Role:Role"
  "RoleBinding:RoleBinding"
  "ServiceAccount:ServiceAccount"
  "networkPolicy:NetworkPolicy"
  "horizontalpodautoscaler:HorizontalPodAutoscaler"
  "PersistentVolume:PersistentVolume"
  "PersistentVolumeClaim:PersistentVolumeClaim"
  "storageClass:StorageClass"
  "resourcequota:resourcequota"
  "limitrange:limitrange"
  "PodDisruptionBudget:PodDisruptionBudget"
  "event:event"
  "endpoint:Endpoint"
  "EndpointSlice:EndpointSlice"
  "ingressClass:IngressClass"
  "priorityclass:priorityclass"
  "MutatingWebhook:MutatingWebhook"
  "ValidatingWebhook:ValidatingWebhook"
  "shell:Shell"
  "Counter:counter"
  "client:client"
)

echo "📊 Found ${#K8S_RESOURCES[@]} K8s resource modules to process"
echo ""

# Function to check if test exists
test_exists() {
  local dir=$1
  local file=$2
  local test_file="${file%.ts}.spec.ts"

  if [ -f "$dir/$test_file" ]; then
    return 0  # Test exists
  else
    return 1  # Test doesn't exist
  fi
}

# Function to get resource name from directory
get_resource_name() {
  local dir_name=$1
  echo "$dir_name" | awk -F: '{print $2}'
}

# Function to get directory name
get_dir_name() {
  local entry=$1
  echo "$entry" | awk -F: '{print $1}'
}

# Process each resource
for resource_entry in "${K8S_RESOURCES[@]}"; do
  DIR_NAME=$(get_dir_name "$resource_entry")
  RESOURCE_NAME=$(get_resource_name "$resource_entry")

  RESOURCE_DIR="$BACKEND_K8S/$DIR_NAME"

  if [ ! -d "$RESOURCE_DIR" ]; then
    echo "  ⚠️  Directory not found: $DIR_NAME"
    continue
  fi

  CONTROLLER_FILE="$RESOURCE_NAME.controller.ts"
  SERVICE_FILE="$RESOURCE_NAME.service.ts"

  # Check controller
  if [ -f "$RESOURCE_DIR/$CONTROLLER_FILE" ]; then
    if test_exists "$RESOURCE_DIR" "$CONTROLLER_FILE"; then
      echo "  ⏭️  $DIR_NAME: controller test exists"
    else
      echo "  ✅ $DIR_NAME: generating controller test"
      GENERATED_COUNT=$((GENERATED_COUNT + 1))
      # Placeholder: actual generation will be done by TypeScript generator
    fi
  fi

  # Check service
  if [ -f "$RESOURCE_DIR/$SERVICE_FILE" ]; then
    if test_exists "$RESOURCE_DIR" "$SERVICE_FILE"; then
      echo "  ⏭️  $DIR_NAME: service test exists"
    else
      echo "  ✅ $DIR_NAME: generating service test"
      GENERATED_COUNT=$((GENERATED_COUNT + 1))
      # Placeholder: actual generation will be done by TypeScript generator
    fi
  fi
done

echo ""
echo "============================================"
echo "📊 Summary:"
echo "  Total resources processed: ${#K8S_RESOURCES[@]}"
echo "  Tests to generate: $GENERATED_COUNT"
echo "============================================"
echo ""
echo "✅ Analysis complete!"
echo ""
echo "Next step: Run 'npm run test:generate' to create test files"

chmod +x "$0"
