import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, Loader2, X, Sun, Moon, Sparkles, Trash2, Zap } from 'lucide-react';
import ResultView from './components/ResultView';
import { compressImage } from './utils/editorUtils';

function App() {
  const [isDark, setIsDark] = useState(false);
  const [images, setImages] = useState([]); // 압축된 Blob/File 배열 (서버 전송용)
  const [previews, setPreviews] = useState([]); // 미리보기 URL 배열
  const [originalNames, setOriginalNames] = useState([]); // 원본 파일명 배열
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);
  const MAX_IMAGES = 20;

  const processFiles = useCallback(async (files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    if (images.length + validFiles.length > MAX_IMAGES) {
      setError(`이미지는 최대 ${MAX_IMAGES}장까지만 업로드 가능합니다.`);
      return;
    }

    setError(null);
    setResult(null);

    // 파일들을 병렬로 압축 (서버 전송 전 최적화)
    const compressed = await Promise.all(validFiles.map(file => compressImage(file)));

    setImages(prev => [...prev, ...compressed]);
    setOriginalNames(prev => [...prev, ...validFiles.map(f => f.name)]);
    
    // 압축된 이미지의 미리보기 URL 생성
    const newPreviews = compressed.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
  }, [images.length]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (indexToRemove) => {
    URL.revokeObjectURL(previews[indexToRemove]);
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setPreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setOriginalNames(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (images.length <= 1 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAllImages = () => {
    previews.forEach(url => URL.revokeObjectURL(url));
    setImages([]);
    setPreviews([]);
    setOriginalNames([]);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (images.length === 0) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    images.forEach(image => {
      formData.append('images', image, image.name);
    });

    try {
      // 백엔드 API 호출 (Vercel 배포 시 VITE_API_URL 환경변수를 사용, 로컬에서는 프록시 사용)
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/generate-detail`, {
        method: 'POST',
        body: formData,
      });

      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `서버에서 올바르지 않은 응답을 받았습니다. (상태 코드: ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error || '상세페이지 생성에 실패했습니다.');
      }

      setResult(data);

      // 생성 완료 후 결과 섹션으로 부드럽게 스크롤
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err) {
      setError(err.message || '상세페이지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">

        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-md">
                <Sparkles className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">AI 상세페이지 생성기</h1>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">네이버 스마트스토어 최적화</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Gemini AI 연결됨</span>
              </div>

              <button
                onClick={() => setIsDark(d => !d)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                aria-label="테마 전환"
              >
                {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-14">

          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 mb-6">
              <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">이미지 → 상세페이지 자동화</span>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
              상품 이미지만 올리면<br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">상세페이지 카피 완성</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Gemini AI가 제품 이미지를 순서대로 분석하여 세일즈 톤앤매너로 블록별 상세 카피를 작성합니다.
              WebP 자동 압축 • 서식 유지 복사 • ZIP 일괄 다운로드를 지원합니다.
            </p>
          </div>

          {/* Upload Card */}
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">

            {/* Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer
                ${isDragging
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]'
                  : previews.length > 0
                    ? 'border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
              />

              {previews.length > 0 ? (
                <div className="space-y-5">
                  {/* Progress Badge */}
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {images.length}장 선택됨 (WebP 압축 완료)
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-medium">
                      860px 최적화
                    </span>
                  </div>

                  {/* Thumbnail Grid */}
                  <div
                    className="flex flex-wrap gap-3 justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {previews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${idx + 1}`}
                          className="h-24 w-24 object-cover rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-colors"></div>
                        <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold text-white bg-black/60 rounded px-1 py-0.5">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* Add More Tile */}
                    {images.length < MAX_IMAGES && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition group"
                      >
                        <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition" />
                        <span className="text-[10px] text-gray-400 group-hover:text-indigo-500 mt-1 font-medium transition">추가</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-5 py-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 rounded-2xl flex items-center justify-center">
                    <UploadCloud className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                      이미지를 드래그 앤 드롭하거나 클릭하여 업로드
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      PNG, JPG, WEBP 지원 · 업로드 즉시 860px WebP 자동 압축 · 최대 {MAX_IMAGES}장
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-center space-x-3">
              {images.length > 0 && (
                <button
                  onClick={clearAllImages}
                  className="flex items-center space-x-2 px-5 py-3.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>전체 지우기</span>
                </button>
              )}

              <button
                onClick={handleGenerate}
                disabled={images.length === 0 || loading}
                className={`flex-grow sm:flex-grow-0 flex items-center justify-center space-x-2.5 px-10 py-3.5 rounded-xl text-base font-extrabold text-white transition-all shadow-lg cursor-pointer
                  ${images.length === 0 || loading
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:shadow-indigo-300 dark:hover:shadow-indigo-900 active:scale-95'
                  }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI 분석 및 생성 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>상세페이지 생성하기 {images.length > 0 && `(${images.length}장)`}</span>
                  </>
                )}
              </button>
            </div>

            {/* Loading Progress Indicator */}
            {loading && (
              <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl text-center">
                <div className="flex items-center justify-center space-x-3">
                  <div className="flex space-x-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    Gemini AI가 {images.length}장의 이미지를 분석하고 있습니다. 잠시만 기다려 주세요...
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl text-center font-medium text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Result View */}
          {result && (
            <div id="result-section">
              {/* STEP 3의 ResultView 파라미터 매핑 부분 수정 */}
              <ResultView 
                blocksData={result.blocks} 
                hashtags={result.hashtags} 
                originalFiles={images} 
              />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 mt-24 py-8 text-center text-xs text-gray-400 dark:text-gray-600">
          <p>AI 상세페이지 생성기 — Powered by Gemini 2.5 Pro · 네이버 스마트스토어 최적화</p>
        </footer>
      </div>
    </div>
  );
}

export default App;