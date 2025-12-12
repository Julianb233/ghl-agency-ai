import { useState } from 'react'
import Button from './components/Button'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          {{PROJECT_NAME}}
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Your new React + TypeScript + Tailwind project
        </p>
        <div className="space-y-4">
          <Button onClick={() => setCount(c => c + 1)}>
            Count is {count}
          </Button>
          <p className="text-sm text-gray-500">
            Edit <code className="bg-gray-200 px-2 py-1 rounded">src/App.tsx</code> to get started
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
