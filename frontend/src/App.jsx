import { useState, useEffect, useRef } from "react"
import axios from "axios"

// ─────────────────────────────────────────────
// DESIGN: Industrial intelligence terminal
// Dark olive + amber accent + monospace data feel
// Feels like a real vendor ops dashboard
// ─────────────────────────────────────────────

const API = "http://127.0.0.1:8000"

// ─── IoT Sensor Simulator ───────────────────
// Simulates what real hardware would send.
// Values drift realistically over time.
function useIoTSimulator(active) {
  const [sensors, setSensors] = useState({
    temperature: 28.4,
    humidity: 62,
    co2_ppm: 412,
    storage_hours: 6,
    ambient_light: "moderate",
  })
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setSensors(prev => {
        const temp = +(prev.temperature + (Math.random() - 0.48) * 0.3).toFixed(1)
        const hum  = Math.min(95, Math.max(30, +(prev.humidity + (Math.random() - 0.5) * 1.2).toFixed(1)))
        const co2  = Math.round(prev.co2_ppm + (Math.random() - 0.5) * 8)
        const hrs  = +(prev.storage_hours + 0.05).toFixed(2)
        const next = { temperature: temp, humidity: hum, co2_ppm: co2, storage_hours: hrs, ambient_light: prev.ambient_light }

        // Alert logic
        const newAlerts = []
        if (temp > 34)  newAlerts.push({ type: "danger",  msg: `🌡️ High temp ${temp}°C — accelerates spoilage` })
        if (hum > 80)   newAlerts.push({ type: "warning", msg: `💧 High humidity ${hum}% — mould risk` })
        if (co2 > 500)  newAlerts.push({ type: "warning", msg: `🌫️ CO₂ ${co2}ppm — poor ventilation` })
        if (hrs > 24)   newAlerts.push({ type: "danger",  msg: `⏱️ Storage ${hrs.toFixed(0)}h — check condition` })
        setAlerts(newAlerts)
        return next
      })
    }, 2000)
    return () => clearInterval(id)
  }, [active])

  return { sensors, alerts }
}

// ─── Helpers ─────────────────────────────────
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

function SensorBar({ label, value, max, unit, warn, danger }) {
  const pct   = Math.min(value / max, 1) * 100
  const color = value >= danger ? "#f87171" : value >= warn ? "#facc15" : "#4ade80"
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span style={{ fontSize:11, color:"#9ca3af", letterSpacing:1 }}>{label}</span>
        <span style={{ fontSize:12, fontFamily:"'IBM Plex Mono',monospace", color }}>{value}{unit}</span>
      </div>
      <div style={{ height:4, background:"#1e2a1a", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:2, transition:"width 0.5s ease" }}/>
      </div>
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
      background:"#0d1a0e", border:`1px solid #1e2a1a`,
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

// ─── Main App ────────────────────────────────
export default function App() {
  const [file, setFile]         = useState(null)
  const [preview, setPreview]   = useState(null)
  const [itemName, setItemName] = useState("banana")
  const [basePrice, setBasePrice] = useState(40)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [iotActive, setIotActive] = useState(true)
  const [tab, setTab]           = useState("analysis")  // analysis | iot | pipeline
  const [scanTime, setScanTime] = useState(null)
  const [pulse, setPulse]       = useState(false)
  const fileRef = useRef()

  const { sensors, alerts: iotAlerts } = useIoTSimulator(iotActive)

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
      setPulse(false)
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
      setPulse(true)
      setTab("analysis")
      setTimeout(() => setPulse(false), 800)
    } catch (err) {
      console.error(err)
      alert("Analysis failed — is the API running?")
    } finally {
      setLoading(false)
    }
  }

  const decision    = result?.decision
  const actionStyle = decision ? (actionMeta[decision.action] || actionMeta.CLEARANCE) : null
  const freshScore  = result?.signals?.freshness || 0

  return (
    <div style={{
      minHeight:"100vh",
      background:"#070e07",
      color:"#e5e7eb",
      fontFamily:"'IBM Plex Sans', 'Segoe UI', sans-serif",
      padding:"0 0 60px 0",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@300;400;600;700&family=Space+Grotesk:wght@700&display=swap');
        * { box-sizing: border-box; margin:0; padding:0 }
        ::-webkit-scrollbar { width:4px } ::-webkit-scrollbar-track { background:#0d1a0e }
        ::-webkit-scrollbar-thumb { background:#2d4a2e; border-radius:4px }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanline { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
        .result-in { animation: fadeIn 0.4s ease forwards }
        .blink { animation: pulse 1.5s infinite }
      `}</style>

      {/* TOPBAR */}
      <div style={{
        background:"#0d1a0e", borderBottom:"1px solid #1e2a1a",
        padding:"14px 32px", display:"flex", alignItems:"center",
        justifyContent:"space-between", position:"sticky", top:0, zIndex:100
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:8, height:8, background:"#4ade80", borderRadius:"50%", boxShadow:"0 0 8px #4ade80" }} className="blink"/>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, letterSpacing:1 }}>
            SMART VENDOR AI
          </span>
          <span style={{ fontSize:10, color:"#4ade80", letterSpacing:2, border:"1px solid #4ade8040", padding:"2px 8px", borderRadius:4 }}>
            v2.0
          </span>
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#6b7280", fontFamily:"'IBM Plex Mono',monospace" }}>
            {new Date().toLocaleTimeString()}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}
            onClick={() => setIotActive(v => !v)}>
            <div style={{ width:6, height:6, borderRadius:"50%",
              background: iotActive ? "#4ade80" : "#6b7280",
              boxShadow: iotActive ? "0 0 6px #4ade80" : "none"
            }}/>
            <span style={{ fontSize:10, color: iotActive ? "#4ade80" : "#6b7280", letterSpacing:1 }}>
              IOT {iotActive ? "LIVE" : "OFF"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px" }}>

        {/* ── TABS ── */}
        <div style={{ display:"flex", gap:2, marginBottom:24, background:"#0d1a0e", borderRadius:10, padding:4, width:"fit-content" }}>
          {[["analysis","🔬 Analysis"], ["iot","📡 IoT Sensors"], ["pipeline","⚙️ Pipeline"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding:"8px 20px", borderRadius:8, border:"none", cursor:"pointer",
              fontSize:12, fontWeight:600, letterSpacing:0.5,
              background: tab === key ? "#1e2a1a" : "transparent",
              color: tab === key ? "#4ade80" : "#6b7280",
              transition:"all 0.2s"
            }}>{label}</button>
          ))}
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* TAB: ANALYSIS */}
        {/* ═══════════════════════════════════════ */}
        {tab === "analysis" && (
          <div style={{ display:"grid", gridTemplateColumns:"380px 1fr", gap:20, alignItems:"start" }}>

            {/* LEFT — Input */}
            <div>
              <Section title="Product Scan" accent="#4ade80">

                {/* Image Drop Zone */}
                <div
                  onClick={() => fileRef.current.click()}
                  style={{
                    border: `2px dashed ${preview ? "#4ade8060" : "#2d4a2e"}`,
                    borderRadius:10, height:200, display:"flex",
                    alignItems:"center", justifyContent:"center",
                    cursor:"pointer", overflow:"hidden",
                    background: preview ? "#000" : "#0a130a",
                    marginBottom:16, position:"relative",
                    transition:"border-color 0.3s"
                  }}>
                  {preview
                    ? <img src={preview} alt="" style={{ maxHeight:"100%", maxWidth:"100%", objectFit:"contain" }}/>
                    : <div style={{ textAlign:"center", color:"#3d5c3e" }}>
                        <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                        <div style={{ fontSize:12, letterSpacing:1 }}>TAP TO UPLOAD IMAGE</div>
                      </div>
                  }
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFile}
                    style={{ display:"none" }}/>
                </div>

                {/* Item + Price */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                  <div>
                    <label style={{ fontSize:10, letterSpacing:1, color:"#6b7280", display:"block", marginBottom:6 }}>PRODUCT</label>
                    <select value={itemName} onChange={e => setItemName(e.target.value)} style={{
                      width:"100%", padding:"10px 12px", background:"#0a130a",
                      border:"1px solid #2d4a2e", borderRadius:8, color:"#e5e7eb",
                      fontSize:13, outline:"none"
                    }}>
                      <option value="banana">🍌 Banana</option>
                      <option value="tomato">🍅 Tomato</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:10, letterSpacing:1, color:"#6b7280", display:"block", marginBottom:6 }}>BASE PRICE ₹</label>
                    <input type="number" value={basePrice} onChange={e => setBasePrice(+e.target.value)} style={{
                      width:"100%", padding:"10px 12px", background:"#0a130a",
                      border:"1px solid #2d4a2e", borderRadius:8, color:"#e5e7eb",
                      fontSize:13, outline:"none"
                    }}/>
                  </div>
                </div>

                {/* IoT context preview */}
                <div style={{ background:"#0a130a", border:"1px solid #1e2a1a", borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
                  <div style={{ fontSize:10, color:"#4ade80", letterSpacing:1, marginBottom:6 }}>
                    📡 LIVE IOT CONTEXT
                    <span style={{ color:"#6b7280", marginLeft:8 }}>
                      (simulated — shows integration point)
                    </span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                    {[
                      ["Temp", `${sensors.temperature}°C`],
                      ["Humidity", `${sensors.humidity}%`],
                      ["CO₂", `${sensors.co2_ppm}ppm`],
                      ["Stored", `${sensors.storage_hours.toFixed(1)}h`],
                    ].map(([k,v]) => (
                      <div key={k} style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
                        <span style={{ color:"#6b7280" }}>{k}: </span>
                        <span style={{ color:"#e5e7eb" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analyze button */}
                <button onClick={handleAnalyze} disabled={loading} style={{
                  width:"100%", padding:"14px", borderRadius:10, border:"none",
                  background: loading ? "#1e2a1a" : "#166534",
                  color: loading ? "#6b7280" : "#4ade80",
                  fontSize:13, fontWeight:700, letterSpacing:2, cursor: loading ? "default":"pointer",
                  transition:"all 0.2s", boxShadow: loading ? "none" : "0 0 20px #4ade8020"
                }}>
                  {loading ? "⟳  ANALYZING..." : "▶  RUN ANALYSIS"}
                </button>

                {scanTime && !loading && (
                  <div style={{ textAlign:"center", fontSize:10, color:"#4ade8080", marginTop:8, fontFamily:"'IBM Plex Mono',monospace" }}>
                    Scan completed in {scanTime}s
                  </div>
                )}
              </Section>

              {/* IoT Alerts */}
              {iotAlerts.length > 0 && (
                <Section title="Smart Risk Alerts" accent="#f87171">
                  {iotAlerts.map((a, i) => (
                    <div key={i} style={{
                      padding:"8px 12px", borderRadius:7, marginBottom:6,
                      background: a.type === "danger" ? "#3f0f0f" : "#2a1f00",
                      border: `1px solid ${a.type === "danger" ? "#f8717140":"#facc1540"}`,
                      fontSize:11, color: a.type === "danger" ? "#f87171":"#facc15"
                    }}>{a.msg}</div>
                  ))}
                </Section>
              )}
            </div>

            {/* RIGHT — Results */}
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

                  {/* PRICE DECISION HERO */}
                  <div style={{
                    background: actionStyle?.bg || "#0d1a0e",
                    border:`1px solid ${actionStyle?.color || "#4ade80"}30`,
                    borderRadius:12, padding:"24px 28px", marginBottom:16,
                    display:"flex", alignItems:"center", justifyContent:"space-between"
                  }}>
                    <div>
                      <div style={{ fontSize:10, color:"#6b7280", letterSpacing:2, marginBottom:6 }}>RECOMMENDED PRICE</div>
                      <div style={{ fontSize:56, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif", color: actionStyle?.color || "#4ade80", lineHeight:1 }}>
                        ₹{result.recommended_price}
                      </div>
                      <div style={{ fontSize:11, color:"#6b7280", marginTop:6, fontFamily:"'IBM Plex Mono',monospace" }}>
                        Base ₹{result.base_price}  →  ML ₹{result.ml_price_raw}  →  Final ₹{result.recommended_price}
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

                  {/* FRESHNESS GAUGES */}
                  <Section title="Freshness Intelligence" accent="#4ade80">
                    <div style={{ display:"flex", justifyContent:"space-around", flexWrap:"wrap", gap:12, marginBottom:16 }}>
                      <RadialGauge value={result.signals.freshness} max={100} label="Freshness %" color={freshColor(result.signals.freshness)}/>
                      <RadialGauge value={+(result.signals.risk * 100).toFixed(0)} max={100} label="Spoilage Risk %" color="#f87171"/>
                      <RadialGauge value={result.signals.shelf_life} max={7} label="Shelf Life (days)" color="#facc15"/>
                      <RadialGauge value={result.signals.dominant_conf || 0} max={100} label="Model Conf %" color="#60a5fa"/>
                    </div>

                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                      <Pill text={result.market_context.freshness_grade}
                        color={freshColor(result.signals.freshness)}
                        bg={`${freshColor(result.signals.freshness)}15`}/>
                      <Pill text={result.signals.quality} color="#60a5fa" bg="#0c1a2e"/>
                      <Pill text={result.signals.urgency} color="#fb923c" bg="#1a0e00"/>
                      <Pill text={result.market_context.season} color="#a78bfa" bg="#150d2e"/>
                      {result.market_context.is_weekend && <Pill text="weekend" color="#34d399" bg="#021f14"/>}
                    </div>

                    {result.signals.is_borderline && (
                      <div style={{
                        padding:"8px 14px", borderRadius:8, background:"#1c1400",
                        border:"1px solid #facc1540", fontSize:11, color:"#facc15"
                      }}>
                        ⚠️ {result.signals.borderline_note}
                      </div>
                    )}

                    <div style={{ marginTop:12, fontSize:11, fontFamily:"'IBM Plex Mono',monospace", color:"#6b7280", display:"flex", gap:16 }}>
                      <span>🕐 Spoils in ~{result.market_context.spoilage_hours}h</span>
                      <span>⏳ Time decay: ×{result.signals.time_decay}</span>
                    </div>
                  </Section>

                  {/* YOLO PREDICTION */}
                  <Section title="Vision AI — Class Probabilities" accent="#60a5fa">
                    <div style={{ fontSize:10, color:"#6b7280", marginBottom:10 }}>
                      YOLOv8s model · {itemName} ripeness classifier · {result.signals.dominant_class} detected
                    </div>
                    {Object.entries(result.yolo_prediction)
                      .sort((a,b) => b[1]-a[1])
                      .map(([cls, prob]) => (
                        <ProbBar key={cls} label={cls} value={prob}/>
                    ))}
                  </Section>

                  {/* MARKET CONTEXT */}
                  <Section title="Market Context Engine" accent="#a78bfa">
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:12 }}>
                      {[
                        ["Demand Score", result.market_context.demand_score],
                        ["Stock Level", result.market_context.stock],
                        ["Market Noise", result.market_context.market_noise],
                      ].map(([k,v]) => (
                        <div key={k} style={{ background:"#0a130a", borderRadius:8, padding:"12px", textAlign:"center" }}>
                          <div style={{ fontSize:20, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", color:"#a78bfa" }}>{v}</div>
                          <div style={{ fontSize:9, color:"#6b7280", letterSpacing:1, marginTop:4 }}>{k}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:"#6b7280", fontFamily:"'IBM Plex Mono',monospace" }}>
                      {result.market_context.time_of_day} · {result.market_context.season} season
                      {result.market_context.is_weekend ? " · weekend boost active" : ""}
                    </div>

                    {/* IoT enrichment note */}
                    <div style={{ marginTop:12, padding:"8px 12px", background:"#0d1a0e", border:"1px solid #1e2a1a", borderRadius:8 }}>
                      <div style={{ fontSize:10, color:"#4ade80", letterSpacing:1, marginBottom:4 }}>📡 IOT ENRICHMENT LAYER</div>
                      <div style={{ fontSize:11, color:"#6b7280" }}>
                        Temp <span style={{ color:"#e5e7eb" }}>{sensors.temperature}°C</span> ·
                        Humidity <span style={{ color:"#e5e7eb" }}>{sensors.humidity}%</span> ·
                        CO₂ <span style={{ color:"#e5e7eb" }}>{sensors.co2_ppm}ppm</span> ·
                        Stored <span style={{ color:"#e5e7eb" }}>{sensors.storage_hours.toFixed(1)}h</span>
                      </div>
                      <div style={{ fontSize:10, color:"#4d7c5e", marginTop:4 }}>
                        In production: feeds from DHT22 + MQ-135 sensors via MQTT broker
                      </div>
                    </div>

                    {/* Market context alerts */}
                    {result.market_context.alerts?.length > 0 && result.market_context.alerts.map((a,i) => (
                      <div key={i} style={{ marginTop:8, padding:"7px 12px", borderRadius:7, background:"#1a0e00", border:"1px solid #fb923c40", fontSize:11, color:"#fb923c" }}>{a}</div>
                    ))}
                  </Section>

                  {/* DECISION */}
                  <Section title="Decision Engine Output" accent={actionStyle?.color || "#4ade80"}>
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

                  {/* AI EXPLANATION */}
                  <Section title="RAG + LLM Explanation" accent="#f472b6">
                    <div style={{ fontSize:10, color:"#6b7280", marginBottom:10 }}>
                      Groq · LLaMA 3.3 70B · FAISS vector store · 65-line knowledge base
                    </div>
                    <p style={{ fontSize:13, lineHeight:1.9, color:"#d1d5db", fontStyle:"italic" }}>
                      "{result.explanation}"
                    </p>
                  </Section>

                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* TAB: IOT SENSORS */}
        {/* ═══════════════════════════════════════ */}
        {tab === "iot" && (
          <div style={{ maxWidth:700 }}>
            <Section title="IoT Sensor Simulation — Environmental Intelligence" accent="#4ade80">
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:20, lineHeight:1.8 }}>
                This layer simulates what real IoT hardware would feed into the system.
                In production, sensors connect via MQTT/WebSocket.
                The freshness score and pricing decision would incorporate these live readings.
              </div>

              <SensorBar label="TEMPERATURE" value={sensors.temperature} max={50} unit="°C" warn={32} danger={36}/>
              <SensorBar label="HUMIDITY" value={sensors.humidity} max={100} unit="%" warn={70} danger={85}/>
              <SensorBar label="CO₂ CONCENTRATION" value={sensors.co2_ppm} max={800} unit="ppm" warn={450} danger={550}/>
              <SensorBar label="STORAGE DURATION" value={sensors.storage_hours} max={48} unit="h" warn={18} danger={30}/>

              <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
                {[
                  ["🌡️ Temperature Effect", "Above 34°C accelerates banana ripening by 2× — pricing should adapt in real-time"],
                  ["💧 Humidity Effect", "Above 80% humidity encourages mould growth — triggers early discount alert"],
                  ["🌫️ CO₂ Monitoring", "High CO₂ in cold storage indicates produce respiration — signals aging"],
                  ["⏱️ Storage Duration", "Combined with vision AI, storage hours refine shelf-life estimate accuracy"],
                ].map(([title, desc]) => (
                  <div key={title} style={{ background:"#0a130a", border:"1px solid #1e2a1a", borderRadius:10, padding:14 }}>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>{title}</div>
                    <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.7 }}>{desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop:20, padding:"12px 16px", background:"#0a130a", border:"1px dashed #2d4a2e", borderRadius:10 }}>
                <div style={{ fontSize:10, color:"#4ade80", letterSpacing:1, marginBottom:6 }}>PRODUCTION INTEGRATION PATH</div>
                <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.8 }}>
                  Raspberry Pi + DHT22 (temp/humidity) + MQ-135 (CO₂) → MQTT broker →
                  FastAPI /sensor endpoint → merged with YOLO freshness score →
                  adjusted pricing decision
                </div>
              </div>

              <div style={{ textAlign:"center", marginTop:16 }}>
                <button onClick={() => setIotActive(v => !v)} style={{
                  padding:"10px 24px", borderRadius:8, border:`1px solid ${iotActive ? "#f87171":"#4ade80"}`,
                  background:"transparent", color: iotActive ? "#f87171":"#4ade80",
                  cursor:"pointer", fontSize:12, letterSpacing:1
                }}>
                  {iotActive ? "⏹ STOP SIMULATION" : "▶ START SIMULATION"}
                </button>
              </div>
            </Section>

            {iotAlerts.length > 0 && (
              <Section title="Active Sensor Alerts" accent="#f87171">
                {iotAlerts.map((a,i) => (
                  <div key={i} style={{
                    padding:"10px 14px", borderRadius:8, marginBottom:8,
                    background: a.type === "danger" ? "#3f0f0f":"#2a1f00",
                    border:`1px solid ${a.type==="danger"?"#f8717140":"#facc1540"}`,
                    fontSize:12, color: a.type==="danger"?"#f87171":"#facc15"
                  }}>{a.msg}</div>
                ))}
              </Section>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* TAB: PIPELINE — for mentor walkthrough */}
        {/* ═══════════════════════════════════════ */}
        {tab === "pipeline" && (
          <div style={{ maxWidth:750 }}>
            <Section title="System Architecture — 6-Layer Intelligence Pipeline" accent="#60a5fa">
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:20 }}>
                Each layer is independently upgradable.
                The same pipeline works for banana, tomato, or any perishable domain.
              </div>

              {[
                {
                  n:"01", name:"Vision AI", tech:"YOLOv8s · 320px · Transfer Learning",
                  color:"#60a5fa",
                  desc:"Classifies fruit ripeness from image. Improved from YOLOv8n (99.19%) to YOLOv8s with 320px input for better texture detection.",
                  improvement:"YOLOv8n → YOLOv8s · 224px → 320px · +F1/Precision/Recall metrics"
                },
                {
                  n:"02", name:"Signal Engine", tech:"Fruit-agnostic · Confidence threshold · Time decay",
                  color:"#4ade80",
                  desc:"Converts YOLO probabilities to freshness score (0–100), spoilage risk, shelf-life estimate. Works with any fruit model — no hardcoded class names.",
                  improvement:"Fruit-agnostic class mapping · Borderline detection · Hourly price decay"
                },
                {
                  n:"03", name:"IoT + Market Context", tech:"Sensor simulation · Deterministic demand",
                  color:"#a78bfa",
                  desc:"Generates market demand using time-of-day, season, and weekend patterns — same logic as training data. IoT layer adds temperature, humidity, CO₂.",
                  improvement:"random.uniform() removed · Demand = f(time, season, freshness) · IoT integration point"
                },
                {
                  n:"04", name:"ML Pricing", tech:"XGBoost · 5000-row dataset · Freshness-aware floor",
                  color:"#f472b6",
                  desc:"XGBoost model predicts price from 10 features. Price floor now scales with freshness — spoiled items no longer get 75% floor price.",
                  improvement:"Freshness-aware min price · Spoiled = 5% floor · Pricing consistent with training data"
                },
                {
                  n:"05", name:"Decision Engine", tech:"Rule-based · Discount % · Waste log",
                  color:"#facc15",
                  desc:"Converts price to actionable vendor instruction with specific discount %, inventory action text, and rationale. Logs every decision for waste analytics.",
                  improvement:"Discount % added · inventory_action text · decision_log.jsonl · /report endpoint"
                },
                {
                  n:"06", name:"RAG + LLM", tech:"FAISS · SentenceTransformers · Groq LLaMA 3.3 70B",
                  color:"#fb923c",
                  desc:"Retrieves relevant business knowledge from 65-line knowledge base, constructs prompt with full context, generates vendor explanation under 120 words.",
                  improvement:"Knowledge base expanded · Tomato + mandi + multi-industry rules added"
                },
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
                      ↑ {step.improvement}
                    </div>
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Multi-Domain Extensibility" accent="#a78bfa">
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:16 }}>
                The pipeline is domain-agnostic. To deploy for a new industry, only the YOLO model and knowledge base change.
              </div>
              {[
                ["🍌 Fruit Retail (current)", "Banana + Tomato ripeness", "deployed"],
                ["🏪 APMC Mandi Grading", "Grade A/B/C classification → fair farmer pricing", "ready"],
                ["💊 Cold Chain Pharma", "Package integrity → accept / quarantine / reject", "adapter"],
                ["👗 Fashion Retail Markdown", "Garment condition → weekly discount escalation", "adapter"],
                ["🩸 Blood Bank", "Shelf-life priority dispatch → zero expired blood", "adapter"],
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