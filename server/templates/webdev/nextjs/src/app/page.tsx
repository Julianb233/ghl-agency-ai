'use client'

import { useState } from 'react'
import Button from '@/components/Button'

export default function Home() {
  const [count, setCount] = useState(0)

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          {{PROJECT_NAME}}
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Built with Next.js 15 + React 19 + TypeScript + Tailwind CSS
        </p>
        <div className="space-y-4">
          <Button onClick={() => setCount(c => c + 1)}>
            Count is {count}
          </Button>
          <p className="text-sm text-gray-500">
            Edit <code className="bg-gray-200 px-2 py-1 rounded">src/app/page.tsx</code> to get started
          </p>
        </div>
      </div>
    </main>
  )
}
