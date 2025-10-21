<script setup lang="ts">
import { K8sService } from '@frontend/service/k8s/K8sService'
import {
  NAlert,
  NButton,
  NCard,
  NDivider,
  NIcon,
  NList,
  NListItem,
  NProgress,
  NSpace,
  NSpin,
  NText,
  NUpload,
  useMessage,
} from 'naive-ui'
import { computed, ref } from 'vue'
import { CheckmarkCircleOutline, CloseCircleOutline, CloudUploadOutline } from '@vicons/ionicons5'

const message = useMessage()

// Reactive state
const fileList = ref<File[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadResults = ref<{
  success: boolean
  message: string
  results: Array<{
    fileName: string
    resource: string
    namespace: string
    result: any
  }>
  errors: Array<{
    fileName: string
    error: string
  }>
} | null>(null)

// Computed properties
const canUpload = computed(() => fileList.value.length > 0 && !uploading.value)
const hasResults = computed(() => uploadResults.value !== null)

// File handling
function handleFileChange({ fileList: newFileList }: { fileList: File[] }) {
  // Filter only YAML files
  const yamlFiles = newFileList.filter(file =>
    file.name.endsWith('.yaml') || file.name.endsWith('.yml'),
  )

  if (yamlFiles.length !== newFileList.length)
    message.warning('Only YAML files (.yaml, .yml) are supported')

  fileList.value = yamlFiles
}

function handleRemoveFile(file: File) {
  const index = fileList.value.findIndex(f => f.name === file.name)
  if (index > -1)
    fileList.value.splice(index, 1)
}

// Upload functionality
async function handleUpload() {
  if (fileList.value.length === 0) {
    message.warning('Please select files to upload')
    return
  }

  uploading.value = true
  uploadProgress.value = 0
  uploadResults.value = null

  try {
    // Simulate progress
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90)
        uploadProgress.value += Math.random() * 10
    }, 200)

    const result = await K8sService.batchUploadFiles(fileList.value)

    clearInterval(progressInterval)
    uploadProgress.value = 100

    uploadResults.value = result

    if (result.success)
      message.success(result.message)
    else
      message.error(`Upload completed with errors: ${result.errors.length} errors`)
  }
  catch (error) {
    message.error(`Upload failed: ${error.message}`)
    uploadResults.value = {
      success: false,
      message: 'Upload failed',
      results: [],
      errors: [{ fileName: 'Upload Error', error: error.message }],
    }
  }
  finally {
    uploading.value = false
  }
}

function clearResults() {
  uploadResults.value = null
  fileList.value = []
  uploadProgress.value = 0
}
</script>

<template>
  <div class="batch-upload-container">
    <NCard title="Batch File Upload" size="large">
      <template #header-extra>
        <NText depth="3">
          Upload multiple YAML files to create/update Kubernetes resources
        </NText>
      </template>

      <!-- File Upload Area -->
      <NSpace vertical size="large">
        <NUpload
          :file-list="fileList"
          multiple
          accept=".yaml,.yml"
          :max="50"
          :disabled="uploading"
          @change="handleFileChange"
          @remove="handleRemoveFile"
        >
          <NUpload.Dragger>
            <div style="margin-bottom: 12px">
              <NIcon size="48" :depth="3">
                <CloudUploadOutline />
              </NIcon>
            </div>
            <NText style="font-size: 16px">
              Click or drag YAML files to this area to upload
            </NText>
            <NText depth="3" style="font-size: 14px">
              Support for batch upload of up to 50 files
            </NText>
          </NUpload.Dragger>
        </NUpload>

        <!-- Upload Progress -->
        <div v-if="uploading">
          <NSpace vertical>
            <NText>Uploading files...</NText>
            <NProgress
              type="line"
              :percentage="uploadProgress"
              :show-indicator="true"
            />
          </NSpace>
        </div>

        <!-- Upload Button -->
        <NSpace justify="center">
          <NButton
            type="primary"
            size="large"
            :disabled="!canUpload"
            :loading="uploading"
            @click="handleUpload"
          >
            <template #icon>
              <NIcon>
                <CloudUploadOutline />
              </NIcon>
            </template>
            Upload {{ fileList.length }} Files
          </NButton>

          <NButton
            v-if="hasResults"
            @click="clearResults"
          >
            Clear Results
          </NButton>
        </NSpace>

        <!-- Upload Results -->
        <div v-if="uploadResults">
          <NDivider />

          <!-- Summary Alert -->
          <NAlert
            :type="uploadResults.success ? 'success' : 'warning'"
            :title="uploadResults.success ? 'Upload Successful' : 'Upload Completed with Errors'"
            :description="uploadResults.message"
            show-icon
          />

          <!-- Success Results -->
          <div v-if="uploadResults.results.length > 0">
            <NText strong style="font-size: 16px; margin-top: 16px; display: block;">
              Successfully Processed Resources ({{ uploadResults.results.length }})
            </NText>
            <NList bordered style="margin-top: 8px;">
              <NListItem v-for="result in uploadResults.results" :key="`${result.fileName}-${result.resource}`">
                <template #prefix>
                  <NIcon color="#18a058">
                    <CheckmarkCircleOutline />
                  </NIcon>
                </template>
                <NSpace vertical size="small">
                  <NText strong>
                    {{ result.resource }}
                  </NText>
                  <NText depth="3" style="font-size: 12px;">
                    File: {{ result.fileName }} | Namespace: {{ result.namespace }}
                  </NText>
                </NSpace>
              </NListItem>
            </NList>
          </div>

          <!-- Error Results -->
          <div v-if="uploadResults.errors.length > 0">
            <NText strong style="font-size: 16px; margin-top: 16px; display: block;">
              Errors ({{ uploadResults.errors.length }})
            </NText>
            <NList bordered style="margin-top: 8px;">
              <NListItem v-for="error in uploadResults.errors" :key="error.fileName">
                <template #prefix>
                  <NIcon color="#d03050">
                    <CloseCircleOutline />
                  </NIcon>
                </template>
                <NSpace vertical size="small">
                  <NText strong>
                    {{ error.fileName }}
                  </NText>
                  <NText depth="3" style="font-size: 12px;">
                    {{ error.error }}
                  </NText>
                </NSpace>
              </NListItem>
            </NList>
          </div>
        </div>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.batch-upload-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style>
