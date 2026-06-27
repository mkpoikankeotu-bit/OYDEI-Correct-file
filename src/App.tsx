import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white rounded-lg shadow-2xl p-8 text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Welcome to OYDEI</h1>
        <p className="text-gray-600 mb-6">Your website is deployed successfully!</p>
        <button
          onClick={() => setCount(count + 1)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition"
        >
          Count: {count}
        </button>
      </div>
    </div>
  )
}