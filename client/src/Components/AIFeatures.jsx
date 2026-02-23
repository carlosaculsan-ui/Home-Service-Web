import { useState } from 'react'

function AIFeatures() {
  const [activeTab, setActiveTab] = useState('chatbot')
  const [imagePreview, setImagePreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [damageResult, setDamageResult] = useState(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
      setDamageResult(null)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyze = () => {
    if (!imagePreview) return
    setAnalyzing(true)
    setDamageResult(null)

    // Simulated AI analysis delay
    setTimeout(() => {
      setAnalyzing(false)
      setDamageResult({
        type: "Water Damage / Pipe Leak",
        severity: "Moderate",
        confidence: "91%",
        description: "The image shows signs of water staining and possible pipe leakage behind the wall. Immediate attention is recommended to prevent further structural damage.",
        recommendation: "We recommend booking a licensed plumber for an on-site inspection. Estimated repair time: 2-4 hours.",
        urgency: "High"
      })
    }, 3000)
  }

  return (
    <div className="py-16 px-8 bg-white">

      {/* Section Title */}
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
        Powered by AI
      </h2>
      <p className="text-center text-gray-500 mb-10">
        Smart tools to make home service easier than ever
      </p>

      {/* Tabs */}
      <div className="flex justify-center gap-4 mb-10">
        <button
          onClick={() => setActiveTab('chatbot')}
          className={`px-6 py-3 rounded-full font-semibold transition-all ${
            activeTab === 'chatbot'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🤖 AI Assistant
        </button>
        <button
          onClick={() => setActiveTab('damage')}
          className={`px-6 py-3 rounded-full font-semibold transition-all ${
            activeTab === 'damage'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🔍 AI Damage Detector
        </button>
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl mx-auto">

        {/* Chatbot Tab */}
        {activeTab === 'chatbot' && (
          <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-200">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Vortex AI Assistant</h3>
            <p className="text-gray-500 mb-6">
              Ask our AI anything about home services — pricing, availability, recommendations, and more. Available 24/7!
            </p>
            <div className="flex gap-3 flex-wrap justify-center mb-6">
              {["What services do you offer?", "How much does cleaning cost?", "Book a plumber"].map((suggestion, i) => (
                <span key={i} className="bg-blue-100 text-blue-600 text-sm px-4 py-2 rounded-full cursor-pointer hover:bg-blue-200">
                  {suggestion}
                </span>
              ))}
            </div>
            <button
              onClick={() => document.querySelector('.fixed.bottom-6')?.querySelector('button')?.click()}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 font-semibold"
            >
              Chat with Vortex AI 🤖
            </button>
          </div>
        )}

        {/* Damage Detector Tab */}
        {activeTab === 'damage' && (
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">AI Damage Detector</h3>
              <p className="text-gray-500 text-sm">
                Upload a photo of the damage in your home and our AI will analyze it and recommend the right service for you.
              </p>
            </div>

            {/* Upload Area */}
            <label className="block cursor-pointer">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                imagePreview ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Uploaded" className="max-h-48 mx-auto rounded-lg object-cover" />
                ) : (
                  <div>
                    <div className="text-4xl mb-3">📸</div>
                    <p className="text-gray-500 text-sm">Click to upload or drag and drop</p>
                    <p className="text-gray-400 text-xs mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            {/* Analyze Button */}
            {imagePreview && !damageResult && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-60"
              >
                {analyzing ? '🔍 Analyzing damage...' : '🔍 Analyze Damage'}
              </button>
            )}

            {/* Loading */}
            {analyzing && (
              <div className="mt-4 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm mt-2">AI is analyzing your image...</p>
              </div>
            )}

            {/* Results */}
            {damageResult && (
              <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                <h4 className="font-bold text-gray-800 text-lg">📊 Analysis Results</h4>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Damage Type</span>
                  <span className="font-semibold text-gray-800 text-sm">{damageResult.type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Severity</span>
                  <span className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1 rounded-full font-semibold">{damageResult.severity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Urgency</span>
                  <span className="bg-red-100 text-red-600 text-sm px-3 py-1 rounded-full font-semibold">{damageResult.urgency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">AI Confidence</span>
                  <span className="text-blue-600 font-semibold text-sm">{damageResult.confidence}</span>
                </div>

                <div className="border-t pt-3">
                  <p className="text-gray-600 text-sm mb-2">{damageResult.description}</p>
                  <p className="text-blue-600 text-sm font-medium">{damageResult.recommendation}</p>
                </div>

                <button className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 font-semibold mt-2">
                  Book a Professional Now
                </button>

                <button
                  onClick={() => { setImagePreview(null); setDamageResult(null) }}
                  className="w-full border border-gray-300 text-gray-600 py-2 rounded-xl hover:bg-gray-50 text-sm"
                >
                  Try Another Image
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}

export default AIFeatures