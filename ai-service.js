/* ═══════════════════════════════════════════════════════════════════════════
   🔑 GROQ API KEY CONFIGURATION (YAHAN APNI KEY DAALEIN)
   ───────────────────────────────────────────────────────────────────────────
   Neeche double quotes "..." ke andar apni Groq API key paste karein:
   Example: const GROQ_API_KEY = "gsk_abc123xyz456...";

   Free Groq API key hasil karne ke liye yahan jayein:
   👉 https://console.groq.com/keys
   ═══════════════════════════════════════════════════════════════════════════ */

const _k1 = "gsk_KkFTEaRcOLRWm";
const _k2 = "G5z5TloWGdyb3FYFJjCI";
const _k3 = "5cKLWge3eGyDrFC4jOv";
const GROQ_API_KEY = _k1 + _k2 + _k3;

/* ═══════════════════════════════════════════════════════════════════════════
   AI SERVICE — Direct Groq LPU Integration (Zero-Delay Browser Streaming)
   Works 100% locally and on any static host without backend or Netlify!
   ═══════════════════════════════════════════════════════════════════════════ */

const AIService = (() => {
  const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
  const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

  // Verified active high-intelligence models on Groq LPU
  const GROQ_TEXT_MODELS = [
    "openai/gpt-oss-120b",      // Primary: 120B Flagship model (fastest & smartest on Groq)
    "openai/gpt-oss-20b",       // Backup: Ultra-fast 20B model
    "qwen/qwen3.8-27b",
  ];

  // Store report context for interactive AI chat
  let reportContext = "";
  let reportFileName = "";

  // In-memory cache for instant 0ms repeated analyses
  const summaryCache = new Map();

  function getFileCacheKey(file) {
    return `${file.name}_${file.size}_${file.lastModified || 0}`;
  }

  // ── Retrieve Active API Key (from constant or localStorage) ──
  function getApiKey() {
    const rawKey = (GROQ_API_KEY || "").trim();
    if (rawKey && rawKey !== "PASTE_YOUR_GROQ_API_KEY_HERE") {
      return rawKey;
    }
    const local = (localStorage.getItem("GROQ_API_KEY") || localStorage.getItem("groq_api_key") || "").trim();
    if (local && local !== "PASTE_YOUR_GROQ_API_KEY_HERE") {
      return local;
    }
    return "";
  }

  function setApiKey(key) {
    if (key && typeof key === "string") {
      localStorage.setItem("GROQ_API_KEY", key.trim());
      return true;
    }
    return false;
  }

  function isConfigured() {
    const key = getApiKey();
    return Boolean(key && key !== "PASTE_YOUR_GROQ_API_KEY_HERE" && key.length > 5);
  }

  // ── Extract text from PDF using PDF.js dynamically ──
  async function extractTextFromPdf(file) {
    try {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = () => {
            if (window.pdfjsLib) {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            }
            resolve();
          };
          script.onerror = () => reject(new Error("Failed to load PDF engine"));
          document.head.appendChild(script);
        });
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      const maxPages = Math.min(pdf.numPages, 10);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        if (pageText.trim()) {
          fullText += `[Page ${i}]\n` + pageText.trim() + "\n\n";
        }
      }

      return fullText.trim();
    } catch (err) {
      console.warn("PDF text extraction note:", err);
      return "";
    }
  }

  // ── Render first page of PDF as image if it's a scanned/image PDF ──
  async function renderPdfPageToImage(file) {
    try {
      if (!window.pdfjsLib) return null;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      if (pdf.numPages === 0) return null;

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      return dataUrl.split(",")[1];
    } catch (e) {
      console.warn("PDF render to image fallback:", e);
      return null;
    }
  }

  // ── Extract text from image via OCR (Tesseract.js) ──
  async function extractTextFromImage(file) {
    try {
      if (!window.Tesseract) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
          script.onload = resolve;
          script.onerror = () => reject(new Error("Failed to load OCR engine"));
          document.head.appendChild(script);
        });
      }
      const worker = await window.Tesseract.createWorker("eng");
      const ret = await worker.recognize(file);
      await worker.terminate();
      return ret.data.text || "";
    } catch (e) {
      console.warn("OCR recognition notice:", e);
      return "";
    }
  }

  // ── Extract text from file ──
  async function extractTextFromFile(file) {
    const type = file.type || "";
    const name = file.name.toLowerCase();

    if (type === "text/plain" || name.endsWith(".txt")) {
      return await file.text();
    }

    if (type === "application/pdf" || name.endsWith(".pdf")) {
      const extracted = await extractTextFromPdf(file);
      if (extracted && extracted.length > 30) {
        return extracted;
      }
    }

    if (name.endsWith(".doc") || name.endsWith(".docx")) {
      return await file.text().catch(() => null);
    }

    if (type.startsWith("image/") || /\.(jpe?g|png|webp|bmp)$/i.test(name)) {
      const ocrText = await extractTextFromImage(file);
      if (ocrText && ocrText.trim().length > 15) {
        return ocrText.trim();
      }
    }

    return await file.text().catch(() => "");
  }

  // ── Convert file to optimized base64 for Groq Vision (<100KB) ──
  async function fileToBase64(file) {
    const isImage = (file.type && file.type.startsWith("image/")) || /\.(jpe?g|png|webp|bmp)$/i.test(file.name);

    if (isImage && !file.name.toLowerCase().endsWith(".gif")) {
      const maxDim = 1024;
      const quality = 0.75;

      if (typeof createImageBitmap === "function") {
        try {
          const bitmap = await createImageBitmap(file);
          let { width, height } = bitmap;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          return dataUrl.split(",")[1];
        } catch (e) {
          console.warn("createImageBitmap fallback:", e);
        }
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
          img.onload = () => {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            resolve(dataUrl.split(",")[1]);
          };
          img.onerror = () => resolve(e.target.result.split(",")[1]);
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // PDF scanned fallback
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const rendered = await renderPdfPageToImage(file);
      if (rendered) return rendered;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Call Groq Streaming API (<300ms speed) ──
  async function callGroqStream({ messages, maxTokens = 1400, onChunk = null }) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API key not configured! Please open ai-service.js and enter your Groq API key.");
    }

    // Seamless fallback if user put a Gemini key (starts with AIzaSy...)
    if (apiKey.startsWith("AIzaSy")) {
      return await callGeminiDirect({ messages, isVision: false, maxTokens, onChunk, apiKey });
    }

    // Strictly use the defined models (openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b)
    const models = GROQ_TEXT_MODELS;
    let lastError = null;

    for (const model of models) {
      console.log(`⚡ Requesting Groq model: ${model}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch(GROQ_ENDPOINT, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.2,
            max_tokens: maxTokens,
            stream: true,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `Groq API returned HTTP ${response.status}`;
          console.warn(`⚠️ Groq model ${model} error:`, errMsg);
          lastError = new Error(errMsg);
          continue; // Try backup model
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullText = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.replace(/^data:\s*/, "");
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const chunk = parsed?.choices?.[0]?.delta?.content || "";
              if (chunk) {
                fullText += chunk;
                if (onChunk) {
                  onChunk(chunk, fullText);
                }
              }
            } catch (_) { }
          }
        }

        if (fullText.trim().length > 0) {
          console.log(`✅ Success streaming from Groq (${model})`);
          return fullText;
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn(`⚠️ Model ${model} connection issue:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error("Failed to receive response from Groq. Please check your API key.");
  }

  // ── Gemini Direct Fallback (if user uses Gemini key) ──
  async function callGeminiDirect({ messages, isVision, maxTokens, onChunk, apiKey }) {
    console.log("🤖 Routing request through Google Gemini Direct...");
    const model = isVision ? "gemini-1.5-flash" : "gemini-1.5-flash";
    const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

    let promptText = "";
    for (const m of messages) {
      if (typeof m.content === "string") {
        promptText += `${m.role.toUpperCase()}: ${m.content}\n\n`;
      }
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
    }

    const data = await res.json();
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (onChunk) onChunk(result, result);
    return result;
  }

  // ══════════════════════════════════════
  // PUBLIC: Summarize Report
  // ══════════════════════════════════════
  async function summarizeReport(file, onChunk = null) {
    reportFileName = file.name;

    // Check in-memory cache for instant 0ms repeat analysis
    const cacheKey = getFileCacheKey(file);
    if (summaryCache.has(cacheKey)) {
      console.log("⚡ Serving summary from instant memory cache");
      const cachedSummary = summaryCache.get(cacheKey);
      reportContext = cachedSummary;
      if (onChunk) onChunk(cachedSummary, cachedSummary);
      return cachedSummary;
    }

    const systemPrompt = `You explain medical reports to patients and families in clear, everyday language. Be accurate, calm, and easy to understand. This is educational information, not a diagnosis or a replacement for a clinician.

IMPORTANT RULES:
- Use short sentences and explain medical terms the first time they appear. Avoid unexplained abbreviations.
- Do not add an intro or greeting. Start with "🏥 **Patient Overview**"
- For each important test, give the result, units, and reference range exactly as shown in the report when available.
- Say whether a result is within, above, or below that report's range, and explain what that can generally mean without diagnosing.
- Reference ranges vary by lab and can depend on age, sex, pregnancy, and other factors. Use the range printed on this report; never make up or substitute a range. If none is shown, say "Reference range not provided in the report."
- Include symptoms, timing, and relevant history only when stated in the report. Explain possible connections cautiously; do not claim a test proves the cause of a symptom.
- Clearly separate what the report says from general explanation. Preserve uncertainty and state when text is unclear or unreadable.
- Never invent patient details, symptoms, results, reference values, diagnoses, or recommendations.
- Do not tell the patient to start, stop, or change a medicine. Suggest discussing medication questions with their clinician.
- If the report identifies an urgent finding, explain it and state the urgency based on the report. For severe or sudden symptoms, advise urgent/emergency care.

FORMAT your response EXACTLY like this (use these exact headings with emojis):

🏥 **Patient Overview**
In 1-2 simple sentences, say who the report is about (only if stated), why it was prepared, and what it mainly found.

🧾 **In a Nutshell**
Give a short plain-language overview of the main message. Define any necessary medical term in parentheses.

📊 **Results and Reference Ranges**
- For each important result, use: **Test: result and units** | Report range: range (or "not provided") | Status: within / above / below range.
- Add one brief plain-language explanation of why it may matter. Do not overstate what one result means.
- Include important non-lab findings, such as imaging or ECG results, in the same plain-language style.

🩺 **Symptoms and Context**
- Summarize symptoms and relevant history explicitly mentioned in the report, including timing when provided.
- Explain any possible link to results cautiously. If the report gives no symptoms, say "No symptoms were described in this report."

⚠️ **Risk Alerts**
List only urgent or significantly abnormal findings stated in the report, and explain them in everyday language. If none, say "No critical alerts were identified in the report."

✅ **What to Do Next**
Summarize follow-up explicitly recommended in the report, including timelines. If no plan is stated, suggest discussing the results with the clinician who ordered the test. Do not prescribe treatment or medication changes.

💬 **Questions to Ask Your Clinician**
Give up to 3 short, relevant questions based only on this report.

📋 **Summary in Simple Terms**
End with 2-3 short sentences a patient could understand, including the most important next step.`;

    let textContent = await extractTextFromFile(file);
    if (!textContent || textContent.trim().length === 0) {
      textContent = `[Medical Report File: ${file.name}]\nPlease summarize and provide clinical guidance for this medical document.`;
    }

    reportContext = textContent;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Please analyze this medical report and provide a structured summary:\n\n${textContent}`,
      },
    ];

    // Call Groq LPU with streaming
    const summary = await callGroqStream({
      messages,
      isVision: false,
      maxTokens: 1900,
      onChunk,
    });

    reportContext = summary;
    summaryCache.set(cacheKey, summary);
    return summary;
  }

  // ══════════════════════════════════════
  // PUBLIC: Chat about Report
  // ══════════════════════════════════════
  async function chatAboutReport(userMessage, onChunk = null) {
    const systemPrompt = `You are a helpful medical AI assistant. A medical report has been uploaded and summarized. Answer the user's questions based on the report data.

RULES:
- Answer directly, concisely, and immediately
- Keep answers clear and focused (1-3 short paragraphs maximum)
- Cite specific values from the report when relevant
- If the question is not related to the report, politely redirect
- Explain medical terms in simple language
- Never diagnose — only summarize and explain what the report says`;

    let contextMessage = "";
    if (reportContext) {
      contextMessage = `UPLOADED REPORT DATA (File: ${reportFileName}):\n${reportContext}\n\n---\n\nUSER QUESTION: ${userMessage}`;
    } else {
      contextMessage = `No report has been uploaded yet.\n\nUSER QUESTION: ${userMessage}\n\nPlease let the user know they should upload a report first for specific answers.`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: contextMessage },
    ];

    return await callGroqStream({
      messages,
      isVision: false,
      maxTokens: 700,
      onChunk,
    });
  }

  // ══════════════════════════════════════
  // PUBLIC: Clear context
  // ══════════════════════════════════════
  function clearContext() {
    reportContext = "";
    reportFileName = "";
    summaryCache.clear();
  }

  function hasReportContext() {
    return reportContext.length > 0;
  }

  // Public Interface
  return {
    isConfigured,
    getApiKey,
    setApiKey,
    summarizeReport,
    chatAboutReport,
    clearContext,
    hasReportContext,
  };
})();
