export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  speed?: number // bytes per second
  timeRemaining?: number // seconds
}

export interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error' | 'aborted'
  progress: UploadProgress
  error?: string
  startTime?: number
  endTime?: number
}

export interface UploadCallbacks {
  onProgress?: (progress: UploadProgress) => void
  onStatusChange?: (status: UploadStatus['status']) => void
  onSuccess?: (response: XMLHttpRequest) => void
  onError?: (error: string, xhr: XMLHttpRequest) => void
  onAbort?: () => void
  onRetry?: (attempt: number, maxAttempts: number) => void
}

export interface UseUploadOptions {
  timeout?: number // 超时时间（毫秒）
  withCredentials?: boolean
  headers?: Record<string, string>
  speedSampleSize?: number // 用于计算速度的样本数量
  maxRetries?: number // 最大重试次数
  retryDelay?: number // 重试延迟（毫秒）
}

export function useUpload(options: UseUploadOptions = {}) {
  const {
    timeout = 0,
    withCredentials = false,
    headers = {},
    speedSampleSize = 5,
    maxRetries = 3,
    retryDelay = 1000,
  } = options

  // 响应式状态
  const uploadStatus = ref<UploadStatus>({
    status: 'idle',
    progress: {
      loaded: 0,
      total: 0,
      percentage: 0,
    },
  })

  // 当前的 XMLHttpRequest 实例
  let currentXHR: XMLHttpRequest | null = null

  // 用于计算速度的数据点
  const speedSamples: Array<{ timestamp: number; loaded: number }> = []

  // 计算上传速度和剩余时间
  const calculateSpeed = (
    loaded: number,
  ): { speed: number; timeRemaining?: number } => {
    const now = Date.now()
    speedSamples.push({ timestamp: now, loaded })

    // 保持样本数量在限制内
    if (speedSamples.length > speedSampleSize) {
      speedSamples.shift()
    }

    if (speedSamples.length < 2) {
      return { speed: 0 }
    }

    // 计算平均速度
    const firstSample = speedSamples[0]
    const lastSample = speedSamples[speedSamples.length - 1]

    if (!firstSample || !lastSample) {
      return { speed: 0 }
    }

    const timeDiff = (lastSample.timestamp - firstSample.timestamp) / 1000 // 转换为秒
    const bytesDiff = lastSample.loaded - firstSample.loaded

    const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0

    // 计算剩余时间
    const total = uploadStatus.value.progress.total
    const remaining = total - loaded
    const timeRemaining = speed > 0 ? remaining / speed : undefined

    return { speed, timeRemaining }
  }

  // 更新状态
  const updateStatus = (updates: Partial<UploadStatus>) => {
    uploadStatus.value = { ...uploadStatus.value, ...updates }
  }

  // 更新进度
  const updateProgress = (loaded: number, total: number) => {
    const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0
    const { speed, timeRemaining } = calculateSpeed(loaded)

    const progress: UploadProgress = {
      loaded,
      total,
      percentage,
      speed,
      timeRemaining,
    }

    updateStatus({ progress })
  }

  // 重置状态
  const resetStatus = () => {
    speedSamples.length = 0
    updateStatus({
      status: 'idle',
      progress: {
        loaded: 0,
        total: 0,
        percentage: 0,
      },
      error: undefined,
      startTime: undefined,
      endTime: undefined,
    })
  }

  // 主要的上传函数
  const uploadFile = async (
    file: File,
    signedUrl: string,
    callbacks: UploadCallbacks = {},
    attempt: number = 1,
  ): Promise<XMLHttpRequest> => {
    // 重置状态（仅在第一次尝试时）
    if (attempt === 1) {
      resetStatus()
    }

    return new Promise((resolve, reject) => {
      // 创建新的 XHR 实例
      currentXHR = new XMLHttpRequest()
      const xhr = currentXHR

      // 设置超时
      if (timeout > 0) {
        xhr.timeout = timeout
      }

      // 设置是否携带凭证
      xhr.withCredentials = withCredentials

      // 记录开始时间
      const startTime = Date.now()
      updateStatus({ status: 'uploading', startTime })
      callbacks.onStatusChange?.('uploading')

      // 进度事件处理
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          updateProgress(event.loaded, event.total)
          callbacks.onProgress?.(uploadStatus.value.progress)
        }
      })

      // 成功处理
      xhr.addEventListener('load', () => {
        const endTime = Date.now()
        updateStatus({ status: 'success', endTime })
        callbacks.onStatusChange?.('success')
        callbacks.onSuccess?.(xhr)
        resolve(xhr)
      })

      // 错误处理
      xhr.addEventListener('error', () => {
        const endTime = Date.now()
        let errorMessage = ''

        if (xhr.status === 0) {
          // 状态码 0 通常表示网络连接失败、CORS 问题或服务器不可达
          errorMessage = '网络连接失败'
        } else if (xhr.status >= 400 && xhr.status < 500) {
          errorMessage = `客户端错误 (${xhr.status})`
        } else if (xhr.status >= 500) {
          errorMessage = `服务器错误 (${xhr.status})`
        } else {
          errorMessage = `网络错误 (状态码: ${xhr.status})`
        }

        // 检查是否可以重试
        const canRetry =
          attempt < maxRetries &&
          (xhr.status === 0 || // 网络错误
            xhr.status >= 500 || // 服务器错误
            xhr.status === 429) // 频率限制

        if (canRetry) {
          updateStatus({
            status: 'error',
            error: `${errorMessage} (尝试 ${attempt}/${maxRetries})`,
            endTime,
          })
          callbacks.onRetry?.(attempt, maxRetries)

          // 延迟后重试
          setTimeout(() => {
            uploadFile(file, signedUrl, callbacks, attempt + 1)
              .then(resolve)
              .catch(reject)
          }, retryDelay * attempt) // 指数退避
        } else {
          updateStatus({ status: 'error', error: errorMessage, endTime })
          callbacks.onStatusChange?.('error')
          callbacks.onError?.(errorMessage, xhr)
          reject(new Error(errorMessage))
        }
      })

      // 超时处理
      xhr.addEventListener('timeout', () => {
        const endTime = Date.now()
        const errorMessage = `上传超时 (${timeout}ms)`

        // 检查是否可以重试（超时也可以重试）
        const canRetry = attempt < maxRetries

        if (canRetry) {
          updateStatus({
            status: 'error',
            error: `${errorMessage} (尝试 ${attempt}/${maxRetries})`,
            endTime,
          })
          callbacks.onRetry?.(attempt, maxRetries)

          // 延迟后重试
          setTimeout(() => {
            uploadFile(file, signedUrl, callbacks, attempt + 1)
              .then(resolve)
              .catch(reject)
          }, retryDelay * attempt) // 指数退避
        } else {
          updateStatus({ status: 'error', error: errorMessage, endTime })
          callbacks.onStatusChange?.('error')
          callbacks.onError?.(errorMessage, xhr)
          reject(new Error(errorMessage))
        }
      })

      // 中止处理
      xhr.addEventListener('abort', () => {
        const endTime = Date.now()
        updateStatus({ status: 'aborted', endTime })
        callbacks.onStatusChange?.('aborted')
        callbacks.onAbort?.()
        reject(new Error('上传已中止'))
      })

      // 状态变化处理
      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status >= 200 && xhr.status < 300) {
            // 成功情况在 load 事件中处理
            return
          } else if (xhr.status >= 400) {
            const endTime = Date.now()
            let errorMessage = ''

            // 根据状态码提供更友好的错误信息
            switch (xhr.status) {
              case 400:
                errorMessage = '请求格式错误'
                break
              case 401:
                errorMessage = '未授权访问'
                break
              case 403:
                errorMessage = '访问被拒绝'
                break
              case 404:
                errorMessage = '上传接口不存在'
                break
              case 409:
                errorMessage = '文件冲突'
                break
              case 413:
                errorMessage = '文件过大'
                break
              case 415:
                errorMessage = '不支持的文件类型'
                break
              case 429:
                errorMessage = '上传频率过高'
                break
              case 500:
                errorMessage = '服务器内部错误'
                break
              case 502:
              case 503:
              case 504:
                errorMessage = '服务器暂时不可用'
                break
              default:
                errorMessage = `HTTP 错误: ${xhr.status}`
            }

            // 尝试获取服务器返回的详细错误信息
            try {
              const responseText = xhr.responseText
              if (responseText) {
                try {
                  const responseData = JSON.parse(responseText)
                  if (responseData.data?.message) {
                    errorMessage = responseData.data.title || errorMessage
                  }
                } catch {
                  // 如果不是 JSON，使用原始文本
                  errorMessage += ` - ${responseText}`
                }
              }
            } catch {
              // 忽略解析错误
            }

            updateStatus({ status: 'error', error: errorMessage, endTime })
            callbacks.onStatusChange?.('error')
            callbacks.onError?.(errorMessage, xhr)
          }
        }
      })

      // 准备请求
      xhr.open('PUT', signedUrl)

      // 设置请求头
      xhr.setRequestHeader(
        'Content-Type',
        file.type || 'application/octet-stream',
      )

      // 设置自定义请求头
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value)
      })

      // 开始上传
      xhr.send(file)
    })
  }

  // 中止上传
  const abortUpload = () => {
    if (currentXHR && uploadStatus.value.status === 'uploading') {
      currentXHR.abort()
    }
  }

  // 格式化字节大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化时间
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '计算中...'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${secs}秒`
    }
  }

  // 计算属性
  const isUploading = computed(() => uploadStatus.value.status === 'uploading')
  const isIdle = computed(() => uploadStatus.value.status === 'idle')
  const isSuccess = computed(() => uploadStatus.value.status === 'success')
  const isError = computed(() => uploadStatus.value.status === 'error')
  const isAborted = computed(() => uploadStatus.value.status === 'aborted')
  const canAbort = computed(() => isUploading.value && currentXHR !== null)

  // 格式化的进度信息
  const formattedProgress = computed(() => {
    const { loaded, total, percentage, speed, timeRemaining } =
      uploadStatus.value.progress
    return {
      percentage,
      loadedText: formatBytes(loaded),
      totalText: formatBytes(total),
      speedText: speed ? `${formatBytes(speed)}/s` : '',
      timeRemainingText: timeRemaining ? formatTime(timeRemaining) : '',
      progressText: `${formatBytes(loaded)} / ${formatBytes(total)} (${percentage}%)`,
    }
  })

  // 清理函数（仅在组件上下文中可用）
  try {
    onUnmounted(() => {
      abortUpload()
      currentXHR = null
    })
  } catch {
    /* empty */
  }

  return {
    uploadStatus: readonly(uploadStatus),

    isUploading,
    isIdle,
    isSuccess,
    isError,
    isAborted,
    canAbort,
    formattedProgress,

    uploadFile,
    abortUpload,
    resetStatus,
    formatBytes,
    formatTime,
  }
}
