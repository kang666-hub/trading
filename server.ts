import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing support for API
  app.use(express.json());

  // API Route: AI Smart Review
  app.post("/api/ai/review", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        error: "GEMINI_API_KEY 未設定。請先於 AI Studio 的 Settings > Secrets 中設定。" 
      });
    }

    const { 
      code, 
      name, 
      quantity, 
      direction, 
      entryPrice, 
      exitPrice, 
      rating, 
      mentalState, 
      entryReason, 
      exitReason 
    } = req.body;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `你是一位專業的台灣個股期貨與股票當沖/動能交易導師與風控專家。
請根據以下這筆交易的詳細數據進行專業、客觀且具建設性的「智能覆盤檢討」。

【交易資訊】
- 商品代號：${code || "未提供"}
- 商品名稱：${name || '未知股票'}
- 交易方向：${direction || '多'}
- 交易數量 (手/口/張)：${quantity || 0}
- 進場價格：${entryPrice || 0}
- 出場價格：${exitPrice || 0}
- 交易評等：${rating || '🟢好交易'}
- 交易時身心狀態：${mentalState || '冷靜執行'}
- 進場依據：${entryReason || '未填寫'}
- 出場依據：${exitReason || '未填寫'}

請針對以下面向提供一段精確、紮實且溫暖具有啟發性的專業檢討與優化建議（字數控制在 150-200 字，使用繁體中文，可以搭配少量合適的 Emoji）：
1. 檢視交易行為與「進出場依據」是否一致，有沒有不理性的交易衝動？
2. 結合其「交易時身心狀態」與「交易評等」，給予心理建設與風控關鍵題。

請直接輸出檢討建議內容，不需包含標題、前言（如「好的，以下為您分析...」）或結尾，讓使用者可以直接複製或填入備註欄。`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const text = response.text || "無法生成覆盤建議";
      res.json({ review: text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ 
        error: error.message || "Gemini 呼叫失敗，請確認 API 密鑰與網路連線狀況。" 
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite server middleware or static server fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
