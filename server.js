import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ override: true });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const GEMINI_MODEL = 'gemini-2.5-flash'; 

app.post('/api/generate-detail', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '이미지가 업로드되지 않았습니다.' });
    }

    // 클라이언트가 전송한 순서(썸네일 그리드 순서)를 그대로 유지하여 이미지와 설명의 매칭이 섞이지 않도록 합니다.
    const files = req.files;

    const systemInstruction = `
당신은 대한민국 최고 수준의 이커머스 세일즈 카피라이터입니다.
업로드된 상품 이미지들을 순서대로 분석하여 유기적이고 자연스러운 흐름을 갖춘 상세페이지를 구성하세요.

[매칭 및 이미지 번호 지정 규칙]
1. 이미지는 순서대로 '[IMAGE_0]', '[IMAGE_1]', '[IMAGE_2]' ... 와 같이 텍스트 라벨 직후에 제공됩니다.
2. 각 이미지의 라벨 번호(예: [IMAGE_0] -> imageId: 0, [IMAGE_1] -> imageId: 1)를 해당 이미지 분석 결과 블록의 'imageId'에 정확히 매칭해야 합니다. 
3. 이미지의 순서가 섞이지 않도록 반드시 'imageId'는 제공된 라벨의 인덱스 순서와 1:1로 정확하게 일치해야 합니다. (0부터 시작하는 0-based index)

[작성 규칙]
1. 어조/스타일: 가벼운 블로그 말투 배제, 전문적이고 신뢰감 있는 세일즈 톤앤매너(~합니다, ~해 줍니다, ~입니다) 사용.
2. 소제목 적극 활용: 독자의 시선을 사로잡고 글의 구조를 직관적으로 파악할 수 있도록, 각 이미지 설명 블록 시작 부분에 매력적이고 구체적인 소제목(예: "### [소제목 내용]")을 반드시 작성해 주세요. 모든 이미지 블록 본문은 이 소제목으로 시작해야 합니다.
3. 구분선 생성 금지: 이미지별 설명란(본문) 텍스트 내부에는 마크다운 구분선 문자('---' 또는 가로선)를 직접 생성하지 마세요. (필요 시 에디터 단에서 사용자가 수동으로 구분선을 삽입하므로, AI 생성 카피에는 구분선 기호가 포함되지 않아야 합니다.)
4. 요약본 동시 생성: 본문과 별개로, 이미지를 한눈에 볼 수 있는 '미리보기'용 핵심 요약 텍스트를 각 이미지당 최대 2줄로 짧고 강렬하게 작성하세요.
5. 해시태그: 맨 마지막에 상품 연관 최상위 키워드 해시태그 10개 삽입.

결과물은 반드시 아래 JSON 양식으로만 반환하세요:
{
  "blocks": [
    {
      "imageId": 0,
      "text": "해당 이미지 하단에 들어갈 상세하고 유연한 세일즈 설명글 본문 (마크다운, 구분선 '---' 사용 금지)",
      "summary": "상세페이지 미리보기에 들어갈 핵심 요약 (최대 2줄)"
    }
  ],
  "hashtags": ["#키워드1", "#키워드2", ... 총 10개]
}
`;

    // 이미지 파일 버퍼를 [IMAGE_x] 인덱스 태그와 인터리빙하여 Gemini API에 전송
    const parts = [
      { text: `총 ${files.length}장의 상품 이미지를 순서대로 제공합니다. 각 이미지는 '[IMAGE_번호]' 텍스트 라벨 직후에 입력됩니다. 이미지 분석 및 세일즈 블록 카피 작성을 시작해 주세요.\n` }
    ];

    files.forEach((file, index) => {
      parts.push({ text: `\n[IMAGE_${index}]\n` });
      parts.push({
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString('base64')
        }
      });
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: parts }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text;
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON 파싱 에러:", responseText);
      return res.status(500).json({ error: 'AI 응답 파싱 오류가 발생했습니다.' });
    }

    res.json(result);
  } catch (error) {
    console.error('API 에러:', error);
    res.status(500).json({ error: '상세페이지 생성 중 오류가 발생했습니다.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});