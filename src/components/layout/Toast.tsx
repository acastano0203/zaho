import { useApp } from '../../store/AppStore'

export function Toast() {
  const { toastMsg } = useApp()
  if (!toastMsg) return null
  return (
    <div role="status"
      className="fixed bottom-[150px] left-1/2 z-80 w-max max-w-[calc(100%-32px)] -translate-x-1/2 rounded-md border border-taupe bg-ink px-4 py-3 text-[13px] text-cream md:bottom-6">
      {toastMsg}
    </div>
  )
}
