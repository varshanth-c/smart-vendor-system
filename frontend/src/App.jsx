import { useState, useRef } from "react"
import axios from "axios"
import IoTControlPanel from "./IoTControlPanel"

const API = "http://127.0.0.1:8000"

const freshColor = f =>
  f >= 85 ? "#4ade80" : f >= 65 ? "#facc15" : f >= 40 ? "#fb923c" : "#f87171"

const actionMeta = {
  SELL_PREMIUM:   { label: "Sell Premium",   color: "#4ade80", bg: "#052e16" },
  SELL_STANDARD:  { label: "Sell Standard",  color: "#86efac", bg: "#14532d" },
  DISCOUNT_FAST:  { label: "Discount Fast",  color: "#facc15", bg: "#422006" },
  CLEARANCE_SALE: { label: "Clearance Sale", color: "#fb923c", bg: "#431407" },
  CLEARANCE:      { label: "Clearance",      color: "#fbbf24", bg: "#3d1906" },
  DISCARD:        { label: "Discard",        color: "#f87171", bg: "#3f0f0f" },
}

function RadialGauge({ value, max = 100, label, color }) {
  const pct  = Math.min(value / max, 1)
  const r    = 36
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={r} fill="none" stroke="#1e2a1a" strokeWidth={8}/>
        <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 45 45)" style={{ transition:"stroke-dasharray 0.6s ease" }}/>
        <text x={45} y={48} textAnchor="middle" fill={color}
          style={{ fontSize:13, fontFamily:"'IBM Plex Mono',monospace", fontWeight:700 }}>
          {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        </text>
      </svg>
      <span style={{ fontSize:10, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" }}>{label}</span>
    </div>
  )
}

function ProbBar({ label, value }) {
  const pct = (value * 100).toFixed(1)
  const color = label.toLowerCase().includes("ripe") && !label.toLowerCase().includes("over")
    ? "#4ade80" : label.toLowerCase().includes("unripe") ? "#facc15"
    : label.toLowerCase().includes("over") ? "#fb923c" : "#f87171"
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:11, color:"#9ca3af", textTransform:"capitalize" }}>{label}</span>
        <span style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace", color }}>{pct}%</span>
      </div>
      <div style={{ height:6, background:"#1e2a1a", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.8s ease" }}/>
      </div>
    </div>
  )
}

function Pill({ text, color = "#4ade80", bg = "#052e16" }) {
  return (
    <span style={{
      display:"inline-block", padding:"2px 10px", borderRadius:999,
      fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase",
      color, background:bg, border:`1px solid ${color}33`
    }}>{text}</span>
  )
}

function Section({ title, children, accent = "#4ade80" }) {
  return (
    <div style={{
      background:"#0d1a0e", border:"1px solid #1e2a1a",
      borderRadius:12, padding:"20px 24px", marginBottom:16
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <div style={{ width:3, height:16, background:accent, borderRadius:2 }}/>
        <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:"#6b7280", textTransform:"uppercase" }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

export default function App() {
  const [file, setFile]           = useState(null)
  const [preview, setPreview]     = useState(null)
  const [itemName, setItemName]   = useState("banana")
  const [basePrice, setBasePrice] = useState(40)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [tab, setTab]             = useState("analysis")
  const [scanTime, setScanTime]   = useState(null)
  const fileRef = useRef()

  // IoT sensor state — single source of truth
  // IoTControlPanel reads and updates this
  // Analysis tab displays it
  const [sensors, setSensors] = useState({
    temperature:   26,
    humidity:      65,
    co2_ppm:       415,
    storage_hours: 8,
    ambient_light: "moderate",
  })

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }

  const handleAnalyze = async () => {
    if (!file) { alert("Upload an image first"); return }
    try {
      setLoading(true)
      const t0 = performance.now()
      const formData = new FormData()
      formData.append("file", file)
      const res = await axios.post(
        `${API}/analyze?item_name=${itemName}&base_price=${basePrice}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      setScanTime(((performance.now() - t0) / 1000).toFixed(2))
      setResult(res.data)
      setTab("analysis")
    } catch (err) {
      console.error(err)
      alert("Analysis failed — is the API running?")
    } finally {
      setLoading(false)
    }
  }

  const decision    = result?.decision
  const actionStyle = decision ? (actionMeta[decision.action] || actionMeta.CLEARANCE) : null

  return (
    <div style={{
      minHeight:"100vh", background:"#070e07", color:"#e5e7eb",
      fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", paddingBottom:60,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@300;400;600;700&family=Space+Grotesk:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0d1a0e}::-webkit-scrollbar-thumb{background:#2d4a2e;border-radius:4px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .result-in{animation:fadeIn 0.4s ease forwards}
        .blink{animation:pulse 1.5s infinite}
      `}</style>

      {/* Topbar */}
      <div style={{
        background:"#0d1a0e", borderBottom:"1px solid #1e2a1a",
        padding:"14px 32px", display:"flex", alignItems:"center",
        justifyContent:"space-between", position:"sticky", top:0, zIndex:100
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:8, height:8, background:"#4ade80", borderRadius:"50%" }} className="blink"/>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, letterSpacing:1 }}>
            SMART VENDOR AI
          </span>
          <span style={{ fontSize:10, color:"#4ade80", letterSpacing:2, border:"1px solid #4ade8040", padding:"2px 8px", borderRadius:4 }}>v2.0</span>
        </div>
        <span style={{ fontSize:10, color:"#6b7280", fontFamily:"'IBM Plex Mono',monospace" }}>
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px" }}>

        {/* Tabs */}
        <div style={{ display:"flex", gap:2, marginBottom:24, background:"#0d1a0e", borderRadius:10, padding:4, width:"fit-content" }}>
          {[["analysis","Analysis"],["iot","IoT Sensors"],["pipeline","Pipeline"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding:"8px 20px", borderRadius:8, border:"none", cursor:"pointer",
              fontSize:12, fontWeight:600, letterSpacing:0.5,
              background: tab === key ? "#1e2a1a" : "transparent",
              color:      tab === key ? "#4ade80" : "#6b7280",
              transition:"all 0.2s"
            }}>{label}</button>
          ))}
        </div>

        {/* ── ANALYSIS TAB ── */}
        {tab === "analysis" && (
          <div style={{ display:"grid", gridTemplateColumns:"380px 1fr", gap:20, alignItems:"start" }}>

            <div>
              <Section title="Product Scan" accent="#4ade80">
                {/* Image drop zone */}
                <div onClick={() => fileRef.current.click()} style={{
                  border:`2px dashed ${preview ? "#4ade8060" : "#2d4a2e"}`,
                  borderRadius:10, height:200, display:"flex", alignItems:"center",
                  justifyContent:"center", cursor:"pointer", overflow:"hidden",
                  background: preview ? "#000" : "#0a130a", marginBottom:16
                }}>
                  {preview
                    ? <img src={preview} alt="" style={{ maxHeight:"100%", maxWidth:"100%", objectFit:"contain" }}/>
                    : <div style={{ textAlign:"center", color:"#3d5c3e" }}>
                        <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                        <div style={{ fontSize:12, letterSpacing:1 }}>TAP TO UPLOAD IMAGE</div>
                      </div>
                  }
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }}/>
                </div>

                {/* Product + price */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                  <div>
                    <label style={{ fontSize:10, letterSpacing:1, color:"#6b7280", display:"block", marginBottom:6 }}>PRODUCT</label>
                    <select value={itemName} onChange={e => setItemName(e.target.value)} style={{
                      width:"100%", padding:"10px 12px", background:"#0a130a",
                      border:"1px solid #2d4a2e", borderRadius:8, color:"#e5e7eb", fontSize:13, outline:"none"
                    }}>
                      <option value="banana">Banana</option>
                      <option value="tomato">Tomato</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:10, letterSpacing:1, color:"#6b7280", display:"block", marginBottom:6 }}>BASE PRICE (Rs.)</label>
                    <input type="number" value={basePrice} onChange={e => setBasePrice(+e.target.value)} style={{
                      width:"100%", padding:"10px 12px", background:"#0a130a",
                      border:"1px solid #2d4a2e", borderRadius:8, color:"#e5e7eb", fontSize:13, outline:"none"
                    }}/>
                  </div>
                </div>

                {/* Live IoT preview — reads from shared sensors state */}
                <div style={{ background:"#0a130a", border:"1px solid #1e2a1a", borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
                  <div style={{ fontSize:10, color:"#4ade80", letterSpacing:1, marginBottom:6 }}>
                    LIVE IOT CONTEXT
                    <span style={{ color:"#6b7280", marginLeft:8, fontSize:9 }}>(change in IoT Sensors tab)</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                    {[
                      ["Temp",     `${sensors.temperature}°C`],
                      ["Humidity", `${sensors.humidity}%`],
                      ["CO2",      `${sensors.co2_ppm}ppm`],
                      ["Stored",   `${typeof sensors.storage_hours === "number" ? sensors.storage_hours.toFixed(1) : sensors.storage_hours}h`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
                        <span style={{ color:"#6b7280" }}>{k}: </span>
                        <span style={{ color:"#e5e7eb" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleAnalyze} disabled={loading} style={{
                  width:"100%", padding:"14px", borderRadius:10, border:"none",
                  background: loading ? "#1e2a1a" : "#166534",
                  color:      loading ? "#6b7280" : "#4ade80",
                  fontSize:13, fontWeight:700, letterSpacing:2,
                  cursor: loading ? "default" : "pointer", transition:"all 0.2s"
                }}>
                  {loading ? "ANALYZING..." : "RUN ANALYSIS"}
                </button>
                {scanTime && !loading && (
                  <div style={{ textAlign:"center", fontSize:10, color:"#4ade8080", marginTop:8, fontFamily:"'IBM Plex Mono',monospace" }}>
                    Scan completed in {scanTime}s
                  </div>
                )}
              </Section>
            </div>

            <div>
              {!result && (
                <div style={{
                  height:400, display:"flex", alignItems:"center", justifyContent:"center",
                  flexDirection:"column", gap:12, color:"#2d4a2e",
                  border:"1px dashed #1e2a1a", borderRadius:12
                }}>
                  <div style={{ fontSize:48 }}>🧪</div>
                  <div style={{ fontSize:12, letterSpacing:2 }}>AWAITING SCAN</div>
                </div>
              )}

              {result && (
                <div className="result-in">

                  {/* Price hero */}
                  <div style={{
                    background: actionStyle?.bg || "#0d1a0e",
                    border:`1px solid ${actionStyle?.color || "#4ade80"}30`,
                    borderRadius:12, padding:"24px 28px", marginBottom:16,
                    display:"flex", alignItems:"center", justifyContent:"space-between"
                  }}>
                    <div>
                      <div style={{ fontSize:10, color:"#6b7280", letterSpacing:2, marginBottom:6 }}>RECOMMENDED PRICE</div>
                      <div style={{ fontSize:56, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif", color: actionStyle?.color || "#4ade80", lineHeight:1 }}>
                        Rs.{result.recommended_price}
                      </div>
                      <div style={{ fontSize:11, color:"#6b7280", marginTop:6, fontFamily:"'IBM Plex Mono',monospace" }}>
                        Base Rs.{result.base_price} → ML Rs.{result.ml_price_raw} → Final Rs.{result.recommended_price}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{
                        fontSize:18, fontWeight:700, color: actionStyle?.color, letterSpacing:1,
                        padding:"10px 20px", border:`1px solid ${actionStyle?.color}40`,
                        borderRadius:10, background:`${actionStyle?.color}10`
                      }}>{actionStyle?.label}</div>
                      {decision.suggested_discount_pct > 0 && (
                        <div style={{ fontSize:24, fontWeight:700, color:"#facc15", marginTop:8 }}>
                          -{decision.suggested_discount_pct}% OFF
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Freshness gauges */}
                  <Section title="Freshness Intelligence" accent="#4ade80">
                    <div style={{ display:"flex", justifyContent:"space-around", flexWrap:"wrap", gap:12, marginBottom:16 }}>
                      <RadialGauge value={result.signals.freshness} max={100} label="Freshness %" color={freshColor(result.signals.freshness)}/>
                      <RadialGauge value={+(result.signals.risk * 100).toFixed(0)} max={100} label="Spoilage Risk %" color="#f87171"/>
                      <RadialGauge value={result.signals.shelf_life} max={7} label="Shelf Life days" color="#facc15"/>
                      <RadialGauge value={result.signals.dominant_conf || 0} max={100} label="Model Conf %" color="#60a5fa"/>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                      <Pill text={result.market_context.freshness_grade} color={freshColor(result.signals.freshness)} bg={`${freshColor(result.signals.freshness)}15`}/>
                      <Pill text={result.signals.quality} color="#60a5fa" bg="#0c1a2e"/>
                      <Pill text={result.signals.urgency} color="#fb923c" bg="#1a0e00"/>
                      <Pill text={result.market_context.season} color="#a78bfa" bg="#150d2e"/>
                      {result.market_context.is_weekend && <Pill text="weekend" color="#34d399" bg="#021f14"/>}
                    </div>
                    {result.signals.is_borderline && (
                      <div style={{ padding:"8px 14px", borderRadius:8, background:"#1c1400", border:"1px solid #facc1540", fontSize:11, color:"#facc15" }}>
                        Between-stage: {result.signals.borderline_note}
                      </div>
                    )}
                    <div style={{ marginTop:12, fontSize:11, fontFamily:"'IBM Plex Mono',monospace", color:"#6b7280", display:"flex", gap:16 }}>
                      <span>Spoils in ~{result.market_context.spoilage_hours}h</span>
                      <span>Time decay: x{result.signals.time_decay}</span>
                    </div>
                  </Section>

                  {/* YOLO */}
                  <Section title="Vision AI — Class Probabilities" accent="#60a5fa">
                    <div style={{ fontSize:10, color:"#6b7280", marginBottom:10 }}>
                      YOLOv8s · {itemName} · {result.signals.dominant_class} detected
                    </div>
                    {Object.entries(result.yolo_prediction).sort((a,b) => b[1]-a[1]).map(([cls, prob]) => (
                      <ProbBar key={cls} label={cls} value={prob}/>
                    ))}
                  </Section>

                  {/* Market context */}
                  <Section title="Market Context" accent="#a78bfa">
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:12 }}>
                      {[["Demand", result.market_context.demand_score],["Stock", result.market_context.stock],["Noise", result.market_context.market_noise]].map(([k,v]) => (
                        <div key={k} style={{ background:"#0a130a", borderRadius:8, padding:12, textAlign:"center" }}>
                          <div style={{ fontSize:20, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", color:"#a78bfa" }}>{v}</div>
                          <div style={{ fontSize:9, color:"#6b7280", letterSpacing:1, marginTop:4 }}>{k}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:"#6b7280", fontFamily:"'IBM Plex Mono',monospace", marginBottom:10 }}>
                      {result.market_context.time_of_day} · {result.market_context.season}{result.market_context.is_weekend ? " · weekend" : ""}
                    </div>
                    {/* IoT context from panel state */}
                    <div style={{ background:"#0a130a", border:"1px solid #1e2a1a", borderRadius:8, padding:"10px 14px" }}>
                      <div style={{ fontSize:10, color:"#4ade80", letterSpacing:1, marginBottom:4 }}>IOT LAYER</div>
                      <div style={{ fontSize:11, color:"#6b7280" }}>
                        Temp <span style={{ color:"#e5e7eb" }}>{sensors.temperature}°C</span> ·
                        Humidity <span style={{ color:"#e5e7eb" }}>{sensors.humidity}%</span> ·
                        CO2 <span style={{ color:"#e5e7eb" }}>{sensors.co2_ppm}ppm</span> ·
                        Stored <span style={{ color:"#e5e7eb" }}>{typeof sensors.storage_hours === "number" ? sensors.storage_hours.toFixed(1) : sensors.storage_hours}h</span>
                      </div>
                    </div>
                    {result.market_context.alerts?.map((a,i) => (
                      <div key={i} style={{ marginTop:8, padding:"7px 12px", borderRadius:7, background:"#1a0e00", border:"1px solid #fb923c40", fontSize:11, color:"#fb923c" }}>{a}</div>
                    ))}
                  </Section>

                  {/* Decision */}
                  <Section title="Decision Engine" accent={actionStyle?.color || "#4ade80"}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                      <div style={{ background:"#0a130a", borderRadius:8, padding:12 }}>
                        <div style={{ fontSize:9, color:"#6b7280", letterSpacing:1, marginBottom:4 }}>ACTION</div>
                        <div style={{ fontSize:14, fontWeight:700, color: actionStyle?.color }}>{decision.action}</div>
                      </div>
                      <div style={{ background:"#0a130a", borderRadius:8, padding:12 }}>
                        <div style={{ fontSize:9, color:"#6b7280", letterSpacing:1, marginBottom:4 }}>PRIORITY</div>
                        <div style={{ fontSize:14, fontWeight:700, color:"#e5e7eb", textTransform:"uppercase" }}>{decision.priority}</div>
                      </div>
                    </div>
                    <div style={{ background:"#0a130a", borderRadius:8, padding:12, marginBottom:12 }}>
                      <div style={{ fontSize:9, color:"#6b7280", letterSpacing:1, marginBottom:4 }}>VENDOR INSTRUCTION</div>
                      <div style={{ fontSize:12, color:"#d1fae5", lineHeight:1.6 }}>{decision.inventory_action}</div>
                    </div>
                    <div style={{ background:"#0a130a", borderRadius:8, padding:12 }}>
                      <div style={{ fontSize:9, color:"#6b7280", letterSpacing:1, marginBottom:4 }}>RATIONALE</div>
                      <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.6 }}>{decision.rationale}</div>
                    </div>
                  </Section>

                  {/* RAG */}
                  <Section title="RAG + LLM Explanation" accent="#f472b6">
                    <div style={{ fontSize:10, color:"#6b7280", marginBottom:8 }}>
                      Groq LLaMA 3.3 70B · FAISS · natural language retrieval
                      {result.explanation?.avg_retrieval_score && (
                        <span style={{ marginLeft:8, color:"#4ade8080" }}>
                          retrieval score: {result.explanation.avg_retrieval_score}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize:13, lineHeight:1.9, color:"#d1d5db", fontStyle:"italic" }}>
                      "{typeof result.explanation === "string"
                        ? result.explanation
                        : result.explanation?.explanation}"
                    </p>
                    {result.explanation?.retrieved_docs && (
                      <details style={{ marginTop:12 }}>
                        <summary style={{ fontSize:10, color:"#6b7280", cursor:"pointer", letterSpacing:1 }}>
                          RETRIEVED KNOWLEDGE ({result.explanation.retrieved_docs.length} docs)
                        </summary>
                        <div style={{ marginTop:8 }}>
                          {result.explanation.retrieved_docs.map((doc, i) => (
                            <div key={i} style={{ fontSize:10, color:"#6b7280", padding:"4px 8px", borderLeft:"2px solid #f472b640", marginBottom:4 }}>{doc}</div>
                          ))}
                        </div>
                      </details>
                    )}
                  </Section>

                </div>
              )}
            </div>
          </div>
        )}

        {/* ── IOT SENSORS TAB ── */}
        {/* IoTControlPanel receives sensors state and setSensors */}
        {/* Any change made here reflects immediately in Analysis tab */}
        {tab === "iot" && (
          <div style={{ maxWidth:700 }}>
            <Section title="IoT Sensor Control — Environmental Intelligence" accent="#4ade80">
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:20, lineHeight:1.8 }}>
                Choose a storage scenario preset or set sensors manually.
                These values are visible in the Analysis tab IoT layer
                and represent what real hardware would feed into the system.
              </div>
              <IoTControlPanel sensors={sensors} onUpdate={setSensors} />
            </Section>
          </div>
        )}

        {/* ── PIPELINE TAB ── */}
        {tab === "pipeline" && (
          <div style={{ maxWidth:750 }}>
            <Section title="System Architecture — 6-Layer Intelligence Pipeline" accent="#60a5fa">
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:20 }}>
                Each layer is independently upgradable. The same pipeline works for any perishable domain.
              </div>
              {[
                { n:"01", name:"Vision AI",            tech:"YOLOv8s · 320px · Transfer Learning",                color:"#60a5fa", desc:"Classifies fruit ripeness from image. YOLOv8s at 320px gives better texture detail than original YOLOv8n at 224px.",                                              improvement:"YOLOv8n → YOLOv8s · 224px → 320px · F1/Precision/Recall added" },
                { n:"02", name:"Signal Engine",        tech:"Fruit-agnostic · Confidence threshold · Time decay",  color:"#4ade80", desc:"Converts YOLO probabilities to freshness score 0-100, risk, shelf life. Works with any fruit — no hardcoded class names.",                                         improvement:"Fruit-agnostic · Borderline detection · Hourly price decay" },
                { n:"03", name:"IoT + Market Context", tech:"Presets · Manual control · Deterministic demand",     color:"#a78bfa", desc:"6 scenario presets + manual sliders. Market demand is time/season/weekend deterministic — consistent with XGBoost training data.",                               improvement:"random.uniform() removed · Presets + sliders wired · IoT panel" },
                { n:"04", name:"ML Pricing",           tech:"XGBoost · 5000-row dataset · Freshness-aware floor",  color:"#f472b6", desc:"XGBoost predicts price from 10 features. Price floor scales with freshness — spoiled items correctly get near-zero floor, not 75%.",                          improvement:"Freshness-aware floor · Spoiled = 5% · Consistent with training" },
                { n:"05", name:"Decision Engine",      tech:"Rule-based · Discount % · Waste log",                 color:"#facc15", desc:"Converts price to vendor instruction with specific discount %, action text, rationale. Logs every decision for waste analytics report.",                        improvement:"Discount % added · inventory_action text · decision_log · /report" },
                { n:"06", name:"RAG + LLM",            tech:"FAISS · Natural language query · Groq LLaMA 3.3 70B", color:"#fb923c", desc:"Natural language retrieval (not key=value). Multi-source: static rules + dynamic market_log that grows with real usage. Retrieval score in API response.", improvement:"NL query · market_log.txt grows · retrieval score shown" },
              ].map((step, i) => (
                <div key={i} style={{ display:"flex", gap:16, marginBottom:20, position:"relative" }}>
                  {i < 5 && <div style={{ position:"absolute", left:19, top:44, width:2, height:"calc(100% + 4px)", background:"#1e2a1a" }}/>}
                  <div style={{ width:40, height:40, borderRadius:10, background:`${step.color}15`, border:`1px solid ${step.color}40`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", color:step.color }}>{step.n}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontWeight:700, fontSize:14, color:step.color }}>{step.name}</span>
                      <span style={{ fontSize:10, color:"#6b7280", fontFamily:"'IBM Plex Mono',monospace" }}>{step.tech}</span>
                    </div>
                    <p style={{ fontSize:12, color:"#9ca3af", lineHeight:1.7, marginBottom:6 }}>{step.desc}</p>
                    <div style={{ fontSize:10, color:step.color, background:`${step.color}10`, padding:"4px 10px", borderRadius:6, display:"inline-block" }}>
                      {step.improvement}
                    </div>
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Multi-Domain Extensibility" accent="#a78bfa">
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:16 }}>
                Swap YOLO model + knowledge base → full pipeline works for new industry.
              </div>
              {[
                ["Fruit Retail (current)", "Banana + Tomato ripeness",                        "deployed"],
                ["APMC Mandi Grading",    "Grade A/B/C → fair farmer pricing",               "ready"],
                ["Cold Chain Pharma",     "Package integrity → accept / quarantine / reject",  "adapter"],
                ["Fashion Retail",        "Garment condition → weekly discount escalation",    "adapter"],
                ["Blood Bank",            "Shelf-life priority dispatch → zero expired blood", "adapter"],
              ].map(([name, desc, status]) => (
                <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#0a130a", borderRadius:8, marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{name}</div>
                    <div style={{ fontSize:11, color:"#6b7280" }}>{desc}</div>
                  </div>
                  <Pill text={status}
                    color={status==="deployed"?"#4ade80":status==="ready"?"#facc15":"#a78bfa"}
                    bg={status==="deployed"?"#052e16":status==="ready"?"#1c1200":"#150d2e"}/>
                </div>
              ))}
            </Section>
          </div>
        )}

      </div>
    </div>
  )
}