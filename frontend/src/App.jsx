import { useState } from "react"
import axios from "axios"

export default function App() {

  const [file, setFile] = useState(null)

  const [itemName, setItemName] = useState("banana")

  const [basePrice, setBasePrice] = useState(40)

  const [loading, setLoading] = useState(false)

  const [result, setResult] = useState(null)


  // =====================================
  // SUBMIT
  // =====================================

  const handleAnalyze = async () => {

    if (!file) {
      alert("Upload image first")
      return
    }

    try {

      setLoading(true)

      const formData = new FormData()

      formData.append("file", file)

      const response = await axios.post(

        `http://127.0.0.1:8000/analyze?item_name=${itemName}&base_price=${basePrice}`,

        formData,

        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      )

      setResult(response.data)

    } catch (err) {

      console.error(err)

      alert("Analysis failed")

    } finally {

      setLoading(false)
    }
  }


  // =====================================
  // UI
  // =====================================

  return (

    <div className="min-h-screen bg-slate-900 text-white p-8">

      <div className="max-w-4xl mx-auto">

        {/* HEADER */}

        <h1 className="text-4xl font-bold mb-2">
          Smart Vendor AI
        </h1>

        <p className="text-slate-400 mb-8">
          AI-powered freshness pricing system
        </p>


        {/* UPLOAD CARD */}

        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg mb-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* ITEM */}

            <div>

              <label className="block mb-2">
                Product
              </label>

              <select
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-700"
              >

                <option value="banana">Banana</option>

                <option value="tomato">Tomato</option>

              </select>

            </div>


            {/* PRICE */}

            <div>

              <label className="block mb-2">
                Base Price
              </label>

              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-700"
              />

            </div>

          </div>


          {/* FILE */}

          <div className="mt-6">

            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full"
            />

          </div>


          {/* BUTTON */}

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-6 bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-bold"
          >

            {loading ? "Analyzing..." : "Analyze Product"}

          </button>

        </div>


        {/* RESULT */}

        {result && (

          <div className="space-y-6">

            {/* PRICE CARD */}

            <div className="bg-slate-800 p-6 rounded-2xl">

              <h2 className="text-2xl font-bold mb-4">
                Pricing Result
              </h2>

              <div className="text-5xl font-bold text-green-400">
                ₹{result.recommended_price}
              </div>

              <div className="mt-3 text-xl">
                {result.decision.action}
              </div>

            </div>


            {/* SIGNALS */}

            <div className="bg-slate-800 p-6 rounded-2xl">

              <h2 className="text-2xl font-bold mb-4">
                Freshness Intelligence
              </h2>

              <div className="grid grid-cols-2 gap-4">

                <div>
                  Freshness:
                  <div className="text-2xl font-bold">
                    {result.signals.freshness}
                  </div>
                </div>

                <div>
                  Risk:
                  <div className="text-2xl font-bold">
                    {result.signals.risk}
                  </div>
                </div>

                <div>
                  Quality:
                  <div className="text-2xl font-bold">
                    {result.signals.quality}
                  </div>
                </div>

                <div>
                  Shelf Life:
                  <div className="text-2xl font-bold">
                    {result.signals.shelf_life} days
                  </div>
                </div>

              </div>

            </div>


            {/* EXPLANATION */}

            <div className="bg-slate-800 p-6 rounded-2xl">

              <h2 className="text-2xl font-bold mb-4">
                AI Recommendation
              </h2>

              <p className="leading-8 text-slate-300">
                {result.explanation}
              </p>

            </div>

          </div>
        )}

      </div>

    </div>
  )
}