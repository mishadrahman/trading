import { useState, useRef } from "react";
import { UploadCloud, TrendingUp, TrendingDown, RefreshCcw, Loader2, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

export default function ChartAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<"UP" | "DOWN" | "UNKNOWN" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith("image/")) {
        setError("Please upload a valid image file.");
        return;
      }
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (!dropped.type.startsWith("image/")) {
        setError("Please upload a valid image file.");
        return;
      }
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
      setResult(null);
      setError(null);
    }
  };

  const analyzeChart = async () => {
    if (!file) return;

    setAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      // ⚠️ WARNING: Using API keys in the client side is generally discouraged for public apps.
      // However, it's required here because GitHub Pages does not support Node.js backend servers.
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key is missing! Please set VITE_GEMINI_API_KEY in GitHub Secrets.");
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const ai = new GoogleGenAI({ apiKey });
          
          const prompt = `You are an expert price-action chart analyst.\n\nAnalyze the uploaded trading chart screenshot and determine the most likely short-term direction based only on visible price action, candle structure, momentum, trend, support/resistance, and market structure.\n\nRules:\n- Respond with ONLY one word: UP or DOWN\n- Do not explain.\n- Do not add extra text.\n- Output must contain exactly one word: UP or DOWN.\n\nMarket Type: OTC\nChart Timeframe: 5 Minutes\nTrade Duration: 15 Seconds`;

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              prompt,
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type,
                },
              },
            ],
            config: { temperature: 0.1 },
          });

          const textResponse = response.text || "";
          const upperText = textResponse.trim().toUpperCase();
          
          let resStatus = "UNKNOWN";
          if (upperText.includes("UP")) {
            resStatus = "UP";
          } else if (upperText.includes("DOWN")) {
            resStatus = "DOWN";
          }

          setResult(resStatus as "UP" | "DOWN" | "UNKNOWN");
        } catch (err: any) {
          setError(err.message || "Failed to analyze chart.");
        } finally {
          setAnalyzing(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setAnalyzing(false);
      };
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setAnalyzing(false);
    }
  };

  const resetAnalyzer = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
      {/* Header Navigation */}
      <nav className="h-16 border-b border-[#1E293B] px-8 flex items-center justify-between bg-[#0F172A] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight text-white hidden sm:block">PRECISION ENGINE <span className="text-emerald-500 text-xs font-mono ml-2">v4.2.0</span></span>
        </div>
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Market Status</span>
            <span className="text-xs text-emerald-400 font-mono">OTC ACTIVE // SYNCED</span>
          </div>
          <div className="hidden sm:block h-8 w-[1px] bg-slate-800"></div>
          <div className="flex gap-4">
            <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono">TF: 5M</div>
            <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono">DUR: 15S</div>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 p-6 gap-6 h-full min-h-[600px] max-w-screen-2xl mx-auto">
          {/* Left: Analysis Input */}
          <section className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex-1 bg-[#0F172A] border border-[#1E293B] rounded-2xl relative overflow-hidden group flex flex-col min-h-[300px]">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
              <div className="absolute top-4 left-4 z-10">
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700">
                  <div className={`w-2 h-2 rounded-full ${analyzing ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">Live Capture Preview</span>
                </div>
              </div>
              
              <div className="flex-1 relative z-20 m-4 mt-16 rounded overflow-hidden border border-slate-800/50 bg-slate-900/20 flex flex-col">
                {!preview ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center p-4 sm:p-12 cursor-pointer group/upload hover:bg-slate-800/30 transition-colors"
                  >
                     <div className="absolute inset-0 flex items-end gap-1 p-4 pb-0 opacity-20 pointer-events-none scale-y-75 origin-bottom blur-[1px]">
                        <div className="w-full bg-red-500/50 h-[40%]"></div>
                        <div className="w-full bg-red-500/50 h-[35%]"></div>
                        <div className="w-full bg-emerald-500/50 h-[50%]"></div>
                        <div className="w-full bg-emerald-500/50 h-[65%]"></div>
                        <div className="w-full bg-red-500/50 h-[55%]"></div>
                        <div className="w-full bg-red-500/50 h-[45%]"></div>
                        <div className="w-full bg-emerald-500/30 h-[75%] border border-emerald-500/30"></div>
                        <div className="w-full bg-emerald-500/30 h-[85%] border border-emerald-500/30"></div>
                     </div>
                     <div className="p-8 sm:p-10 border border-slate-700 bg-slate-900/90 rounded-xl text-center group-hover/upload:border-emerald-500/50 transition-all z-10 backdrop-blur-sm">
                        <p className="text-slate-400 text-sm mb-2 font-bold tracking-wider">DRAG AND DROP CHART SCREENSHOT</p>
                        <p className="text-[10px] text-slate-600 font-mono">SUPPORTED: PNG, JPG, WEBP</p>
                     </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 group/img bg-black/50">
                    <img
                      src={preview}
                      alt="Chart Preview"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <button
                        onClick={resetAnalyzer}
                        className="flex text-sm items-center gap-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-emerald-400 text-white px-6 py-3 rounded-xl font-bold tracking-wider uppercase transition-colors shadow-lg"
                      >
                        <RefreshCcw className="w-4 h-4" />
                        Replace Image
                      </button>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Analysis Interface */}
            <div className="h-auto md:h-48 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                 <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Engine Interface</h3>
                 <div className="h-[1px] w-full bg-[#1E293B] ml-4"></div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center gap-2">
                 {/* Mock Engine History to match design */}
                 <div className="space-y-1 font-mono text-xs mb-2 opacity-50 px-2 hidden sm:block">
                   <div className="flex justify-between py-1 border-b border-slate-800/50">
                     <span className="text-slate-500">[14:22:01] OTC_USD_M5</span>
                     <span className="text-emerald-500">UP // SUCCESS</span>
                   </div>
                   <div className="flex justify-between py-1 border-b border-slate-800/50">
                     <span className="text-slate-500">[14:18:45] OTC_BTC_M5</span>
                     <span className="text-rose-500">DOWN // SUCCESS</span>
                   </div>
                 </div>

                 <button
                    onClick={analyzeChart}
                    disabled={!file || analyzing || result !== null}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 disabled:cursor-not-allowed text-slate-950 font-black text-lg tracking-widest rounded-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.1)] h-16 flex items-center justify-center gap-3 shrink-0"
                 >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        ANALYZING...
                      </>
                    ) : (
                      "EXECUTE ANALYSIS"
                    )}
                 </button>
                 {error && (
                    <p className="mt-2 text-center text-xs font-mono text-rose-500 bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">
                      {error}
                    </p>
                 )}
              </div>
            </div>
          </section>

          {/* Right: High-Stakes Output */}
          <section className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex-1 bg-[#1E293B]/20 border border-emerald-500/30 rounded-2xl flex flex-col overflow-hidden relative">
              {result === "UP" && <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />}
              {result === "DOWN" && <div className="absolute inset-0 bg-rose-500/10 pointer-events-none border-rose-500/30" />}
              {analyzing && <div className="absolute inset-0 bg-amber-500/5 animate-pulse pointer-events-none border-amber-500/30" />}

              <div className={`p-4 border-b text-center relative z-10 flex items-center justify-between ${result === "DOWN" ? "bg-rose-500/10 border-rose-500/20" : result === "UP" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-500/10 border-emerald-500/20"}`}>
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${result === "DOWN" ? "text-rose-500" : "text-emerald-500"}`}>Immediate Prediction</span>
                <span className={`font-mono text-[10px] ${result === "DOWN" ? "text-rose-500/80" : "text-emerald-500/80"}`}>
                  {analyzing ? 'PROCESSING' : result ? 'COMPLETE' : 'STANDBY'}
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 min-h-[300px]">
                 <AnimatePresence mode="wait">
                    {!result && !analyzing && (
                       <motion.div
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center h-full text-slate-600"
                       >
                         <p className="font-mono text-xs text-center border-b border-slate-800 pb-2 tracking-widest">AWAITING DATA</p>
                       </motion.div>
                    )}
                    {analyzing && (
                       <motion.div
                          key="analyzing"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.1 }}
                          className="flex flex-col items-center gap-6"
                       >
                          <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                          <div className="font-mono text-xs text-emerald-400/80 text-center">
                            <p className="animate-pulse">SCANNING...</p>
                          </div>
                       </motion.div>
                    )}
                    {result && (
                       <motion.div
                          key="result"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center text-center w-full"
                       >
                          <span className={`text-8xl font-black tracking-tighter ${result === "UP" ? "text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]"}`}>
                            {result}
                          </span>
                          <div className="mt-8 flex flex-col items-center">
                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Signal Expiry</div>
                            <div className="text-3xl font-mono font-light text-white">00:15<span className="text-slate-600">:00</span></div>
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>
              
              {result && (
                 <button 
                   onClick={resetAnalyzer}
                   className={`m-6 h-16 text-slate-950 font-black text-lg tracking-widest rounded-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] ${result === "DOWN" ? "bg-rose-500 hover:bg-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]" : "bg-emerald-500 hover:bg-emerald-400"}`}
                 >
                   ANALYZE NEXT CHART
                 </button>
              )}
            </div>

            <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 shrink-0 hidden md:block">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Load</span>
                <span className={`text-[10px] font-mono ${analyzing ? "text-amber-500" : "text-emerald-500"}`}>
                  {analyzing ? "DYNAMIC" : "NOMINAL"}
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {[...Array(10)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-8 rounded-sm transition-colors duration-500 ${
                      analyzing 
                        ? (i < [3,5,6,8,7,9,4][Math.floor(Math.random()*7)] ? "bg-amber-500/80" : "bg-slate-800")
                        : (i < 6 ? "bg-emerald-500/80" : i === 6 ? "bg-emerald-500/40" : "bg-slate-800")
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer Status */}
      <footer className="h-10 border-t border-[#1E293B] px-4 sm:px-8 flex items-center justify-between bg-[#0A0C10] text-[10px] font-mono text-slate-500 shrink-0">
        <div className="flex gap-4 sm:gap-6">
          <span>LATENCY: 12ms</span>
          <span className="hidden sm:inline">UPTIME: 99.98%</span>
        </div>
        <div className="flex gap-4 sm:gap-6">
          <span className="text-slate-600 hidden sm:inline">CONNECTED: US-EAST-EDGE-01</span>
          <span className="text-emerald-500">● READY</span>
        </div>
      </footer>
    </div>
  );
}
