import React, { useState, useRef, useEffect } from 'react';
import { Download, Copy, Check, Bold, Minus, FileText, Hash, Loader2, Eye, X } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { copyHtmlToClipboard, compressImage } from '../utils/editorUtils';

const parseMarkdownToHtml = (text) => {
  if (!text) return "";
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^###\s+(.*?)$/gm, '<h3 style="font-size:18px; font-weight:bold; color:#005088; margin:16px 0 6px 0;">$1</h3>');
  html = html.replace(/^##\s+(.*?)$/gm, '<h2 style="font-size:22px; font-weight:bold; color:#005088; margin:20px 0 8px 0;">$1</h2>');
  html = html.replace(/^---\r?$/gm, '<hr style="width:100%; border:none; border-top:2px solid #cbd5e1; margin:24px 0;" />');
  html = html.split('\n').join('<br>');
  return html;
};

// App.jsx와의 완벽한 호환을 위해 result, originalImages props 사용
export default function ResultView({ 
  result = {}, 
  originalImages: propOriginalImages = [], 
  blocksData, 
  hashtags: propsHashtags, 
  originalFiles 
}) {
  const blocks = blocksData || result.blocks || [];
  const hashtags = propsHashtags || result.hashtags || [];
  const originalImages = originalFiles || propOriginalImages || [];
  
  const [copiedBlockId, setCopiedBlockId] = useState(null);
  const [globalCopied, setGlobalCopied] = useState(false);
  const [blockHtmls, setBlockHtmls] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);
  
  // 미리보기 탭 내부 복사 상태 제어
  const [previewCopiedId, setPreviewCopiedId] = useState(null);
  const [previewHashtagsCopied, setPreviewHashtagsCopied] = useState(false);
  
  // 탭 상태 (edit 또는 preview)
  const [activeTab, setActiveTab] = useState('edit');

  const editorRefs = useRef({});

  useEffect(() => {
    const initialHtmls = {};
    blocks.forEach((block) => {
      const index = block.imageId ?? block.imageIndex;
      const text = block.text || block.content || "";
      initialHtmls[index] = parseMarkdownToHtml(text);
    });
    setBlockHtmls(initialHtmls);
  }, [blocks]);

  const handleInput = (imageIndex) => {
    if (editorRefs.current[imageIndex]) {
      setBlockHtmls(prev => ({
        ...prev,
        [imageIndex]: editorRefs.current[imageIndex].innerHTML
      }));
      if (copiedBlockId === imageIndex) {
        setCopiedBlockId(null);
      }
    }
  };

  const execEditorCommand = (e, command, value = null) => {
    e.preventDefault();
    document.execCommand(command, false, value);
  };

  const handleBlockCopy = async (imageIndex, blockTitle) => {
    try {
      const htmlContent = blockHtmls[imageIndex] || "";
      const titleHtml = blockTitle ? `<h3 style="font-size:18px; font-weight:bold; color:#005088; margin:16px 0 6px 0;">${blockTitle}</h3>` : "";
      const fullHtml = `${titleHtml}${htmlContent}`;
      const plainText = editorRefs.current[imageIndex]?.innerText || "";
      
      await copyHtmlToClipboard(fullHtml, plainText);
      
      setCopiedBlockId(imageIndex);
      setTimeout(() => setCopiedBlockId(null), 2500);
    } catch (err) {
      alert('복사에 실패했습니다.');
    }
  };

  const handleGlobalCopy = async () => {
    try {
      let combinedHtml = "";
      blocks.forEach((block) => {
        const index = block.imageId ?? block.imageIndex;
        const titleHtml = block.title ? `<h3 style="font-size:18px; font-weight:bold; color:#005088; margin:16px 0 6px 0;">${block.title}</h3>` : "";
        const contentHtml = blockHtmls[index] || "";
        combinedHtml += `${titleHtml}${contentHtml}<br><br>`;
      });

      if (hashtags.length > 0) {
        const hashtagsHtml = `<p style="color:#4f46e5; font-weight:bold;">${hashtags.map(t => typeof t === 'string' && t.startsWith('#') ? t : `#${t}`).join(' ')}</p>`;
        combinedHtml += `<br>${hashtagsHtml}`;
      }

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = combinedHtml;
      const plainText = tempDiv.innerText;

      await copyHtmlToClipboard(combinedHtml, plainText);
      setGlobalCopied(true);
      setTimeout(() => setGlobalCopied(false), 2500);
    } catch (err) {
      alert('전체 복사에 실패했습니다.');
    }
  };

  const handlePreviewSummaryCopy = async (index, summaryText) => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setPreviewCopiedId(index);
      setTimeout(() => setPreviewCopiedId(null), 2000);
    } catch (err) {
      alert('복사에 실패했습니다.');
    }
  };

  const handlePreviewHashtagsCopy = async () => {
    try {
      const textToCopy = hashtags.map(t => typeof t === 'string' && t.startsWith('#') ? t : `#${t}`).join(' ');
      await navigator.clipboard.writeText(textToCopy);
      setPreviewHashtagsCopied(true);
      setTimeout(() => setPreviewHashtagsCopied(false), 2000);
    } catch (err) {
      alert('해시태그 복사에 실패했습니다.');
    }
  };

  const handleDownloadZip = async () => {
    if (originalImages.length === 0) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      for (let index = 0; index < originalImages.length; index++) {
        const file = originalImages[index];
        const compressedFile = await compressImage(file);
        const paddedIndex = String(index + 1).padStart(2, '0');
        zip.file(`${paddedIndex}_image.webp`, compressedFile);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'naver_smartstore_images.zip');
    } catch (error) {
      alert('ZIP 파일 생성 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-12 space-y-6">
      
      {/* 1. 상단 컨트롤러 (다운로드 영역) */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-t-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <span className="w-3 h-3 bg-emerald-500 rounded-full mr-2.5 animate-pulse"></span>
            상세페이지 콘텐츠 편집 & 배포
          </h2>
          <p className="text-sm text-gray-400 mt-1">네이버 스마트스토어 에디터에 최적화된 서식 복사 시스템입니다.</p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={originalImages.length === 0 || isDownloading}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white px-5 py-3 rounded-xl shadow-md transition-all font-semibold text-sm whitespace-nowrap"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>{isDownloading ? '압축 중...' : '이미지 전체 다운로드 (ZIP)'}</span>
        </button>
      </div>

      {/* 2. 탭 메뉴 영역 (콘텐츠 편집 / 미리보기) */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mt-2 mb-6">
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 ${
            activeTab === 'edit'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-indigo-50/50 dark:bg-gray-800/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400'
          }`}
        >
          콘텐츠 블록 편집
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 flex items-center justify-center gap-2 ${
            activeTab === 'preview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-indigo-50/50 dark:bg-gray-800/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-400'
          }`}
        >
          <Eye className="w-4 h-4" />
          상세페이지 한눈에 미리보기
        </button>
      </div>

      {/* 3. 콘텐츠 영역 */}
      {activeTab === 'edit' ? (
        <div className="space-y-6">
          {blocks.map((block, idx) => {
            const imageIndex = block.imageId ?? block.imageIndex;
            const imageFile = originalImages[imageIndex];
            const imageSrc = imageFile ? URL.createObjectURL(imageFile) : null;
            const isCopied = copiedBlockId === imageIndex;
            const paddedNum = String(idx + 1).padStart(2, '0');

            return (
              <div
                key={imageIndex}
                className={`flex flex-col md:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${
                  isCopied 
                    ? 'opacity-80 bg-gray-50/70 dark:bg-gray-900/50 border-emerald-300 dark:border-emerald-900 scale-[0.99]' 
                    : 'border-gray-100 dark:border-gray-700 hover:shadow-md'
                }`}
              >
                <div className="w-full md:w-1/3 bg-gray-50 dark:bg-gray-900/60 p-6 flex flex-col items-center justify-between border-r border-gray-100 dark:border-gray-700 min-h-[220px]">
                  <div className="w-full flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">BLOCK {paddedNum}</span>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-gray-200/60 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      📌 {paddedNum}_image.webp 매칭
                    </span>
                  </div>
                  {imageSrc ? (
                    <div className="relative group w-full aspect-video md:aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                      <img src={imageSrc} alt={`Block Image ${paddedNum}`} className="max-h-full max-w-full object-contain p-2" />
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-600">
                      <FileText className="w-10 h-10" />
                    </div>
                  )}
                </div>

                <div className="w-full md:w-2/3 p-6 flex flex-col justify-between">
                  <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4 flex justify-between items-center gap-3">
                    <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5 border border-gray-200/50 dark:border-gray-800 flex-shrink-0">
                      <button onMouseDown={(e) => execEditorCommand(e, 'bold')} title="굵게" className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300"><Bold className="w-4 h-4" /></button>
                      <button onMouseDown={(e) => execEditorCommand(e, 'insertHorizontalRule')} title="구분선" className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-300"><Minus className="w-4 h-4" /></button>
                    </div>

                    <button
                      onClick={() => handleBlockCopy(imageIndex, block.title)}
                      className={`flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap min-w-[70px] flex-shrink-0 ${
                        isCopied
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400'
                          : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? '완료' : '복사'}</span>
                    </button>
                  </div>

                  <div
                    ref={(el) => (editorRefs.current[imageIndex] = el)}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => handleInput(imageIndex)}
                    className="flex-grow min-h-[140px] prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 focus:outline-none leading-relaxed whitespace-pre-wrap p-3 rounded-lg border border-transparent focus:border-indigo-100 focus:bg-indigo-50/10 transition"
                    dangerouslySetInnerHTML={{ __html: blockHtmls[imageIndex] || '' }}
                    style={{ minHeight: '140px', fontFamily: 'system-ui, sans-serif' }}
                  />
                </div>
              </div>
            );
          })}

          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-400 max-w-md leading-relaxed">
                ※ [전체 복사] 버튼을 누르면 본문(이미지 매칭별 소제목, 텍스트, 굵기 및 구분선 서식 등) 전체가 한 번에 복사됩니다.
              </p>
              <button
                onClick={handleGlobalCopy}
                className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 rounded-xl text-base font-bold shadow-md transition-all whitespace-nowrap ${
                  globalCopied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {globalCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                <span>{globalCopied ? '전체 서식 복사 완료!' : '전체 텍스트 복사'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-16">
          {blocks.map((block, idx) => {
            const imageIndex = block.imageId ?? block.imageIndex;
            const imageFile = originalImages[imageIndex];
            const isSummaryCopied = previewCopiedId === imageIndex;
            
            const displaySummary = block.summary || block.content || block.text || "텍스트가 없습니다.";

            return (
              <React.Fragment key={imageIndex}>
                {idx > 0 && (
                  <hr className="w-[calc(100%+4rem)] -mx-8 border-0 border-t-2 border-gray-200 dark:border-gray-700 my-16" />
                )}
                <div className="flex flex-col items-center mx-auto w-full max-w-2xl">
                  {imageFile && (
                    <img src={URL.createObjectURL(imageFile)} alt={`Preview ${idx}`} className="w-full h-auto object-cover rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700" />
                  )}
                  
                  <div className="w-full mt-6 bg-gray-50 dark:bg-gray-800/50 p-8 rounded-2xl relative group border border-gray-100 dark:border-gray-700">
                    <div 
                      className="text-base text-gray-800 dark:text-gray-200 leading-relaxed font-medium text-center px-4 prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(displaySummary) }}
                    />
                    
                    <div className="mt-6 flex justify-center">
                      <button 
                        onClick={() => handlePreviewSummaryCopy(imageIndex, displaySummary)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          isSummaryCopied 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400' 
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {isSummaryCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {isSummaryCopied ? '복사 완료' : '텍스트 복사'}
                      </button>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {hashtags && hashtags.length > 0 && (
            <div className="max-w-2xl mx-auto border-t border-gray-200 dark:border-gray-700 pt-10 mt-10 text-center">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">연관 해시태그</h3>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {hashtags.map((tag, i) => (
                  <span key={i} className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                    {typeof tag === 'string' && tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
              <button 
                onClick={handlePreviewHashtagsCopy}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
                  previewHashtagsCopied 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {previewHashtagsCopied ? <Check className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                {previewHashtagsCopied ? '해시태그 복사 완료' : '해시태그 일괄 복사'}
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}