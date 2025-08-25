'use client'

import React, { useState } from 'react'
import { Upload, FileImage, CheckCircle, XCircle } from 'lucide-react'

export default function TestOCR() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/test-ocr', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.message || 'Failed to process image')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="card">
          <h1 className="text-2xl font-bold mb-6 flex items-center space-x-2">
            <FileImage className="h-6 w-6 text-primary-500" />
            <span>Test OCR Functionality</span>
          </h1>

          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Transaction Screenshot
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG, JPEG up to 10MB
                  </span>
                </label>
              </div>

              {file && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected: {file.name}
                </div>
              )}
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FileImage className="h-4 w-4" />
                  <span>Extract Transaction Data</span>
                </>
              )}
            </button>

            {/* Results */}
            {result && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/50">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium text-green-800 dark:text-green-300">
                    Transaction Data Extracted
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Amount:</span> Nu.{result.amount}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {result.type}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {result.category}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {result.date}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Merchant:</span> {result.merchant}
                  </div>
                  {result.description && (
                    <div>
                      <span className="font-medium">Description:</span> {result.description}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700/50">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800 dark:text-red-300">{error}</span>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700/50">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                Testing Tips:
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Use clear screenshots from banking apps</li>
                <li>• Make sure amount, merchant, and date are visible</li>
                <li>• Avoid blurry or low-resolution images</li>
                <li>• Test with different transaction types</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}