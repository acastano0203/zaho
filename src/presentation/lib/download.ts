/** Descarga un archivo de texto generado en el navegador (no pasa por ningún servidor). */
export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  downloadBlob(filename, new Blob(['﻿' + content], { type: mime }))   // BOM: Excel reconoce UTF-8
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
