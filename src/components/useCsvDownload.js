import { downloadCsv } from '../lib/csv'
import { useToast } from './Toast.jsx'
// Downloads a CSV and confirms it with a notification.
export function useCsvDownload() {
  const toast = useToast()
  return (name, text) => { downloadCsv(name, text); toast.success(`Downloaded ${name}`) }
}
