import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FALLBACK_RECORD, FALLBACK_STATUS } from '../../../app/model'
import { api, type FilesResponse } from '../../../services/deviceApi'

const EMPTY_FILES: FilesResponse = { files: [], root: '', externalDisk: null }

export const deviceQueryKeys = {
  runtime: ['device', 'runtime'] as const,
  files: ['device', 'files'] as const,
}

export function useDeviceRuntime() {
  const queryClient = useQueryClient()
  const runtimeQuery = useQuery({
    queryKey: deviceQueryKeys.runtime,
    queryFn: async () => {
      const [status, record] = await Promise.all([api.status(), api.recordStatus()])
      return { status, record }
    },
    refetchInterval: 3_000,
  })
  const filesQuery = useQuery({
    queryKey: deviceQueryKeys.files,
    queryFn: api.files,
    refetchInterval: 5_000,
  })
  const toggleRecordMutation = useMutation({
    mutationFn: api.toggleRecord,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: deviceQueryKeys.runtime }),
        queryClient.invalidateQueries({ queryKey: deviceQueryKeys.files }),
      ])
    },
  })

  return {
    status: runtimeQuery.data?.status ?? FALLBACK_STATUS,
    record: runtimeQuery.data?.record ?? FALLBACK_RECORD,
    files: filesQuery.data ?? EMPTY_FILES,
    online: runtimeQuery.isSuccess && !runtimeQuery.isError,
    busy: toggleRecordMutation.isPending,
    toggleRecord: toggleRecordMutation.mutateAsync,
    refreshStatus: async () => { await runtimeQuery.refetch() },
    refreshFiles: async () => { await filesQuery.refetch() },
  }
}
