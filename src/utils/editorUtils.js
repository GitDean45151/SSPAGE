/**
 * 이미지를 최대 가로폭 860px의 WebP(품질 0.8) 포맷으로 압축합니다.
 * @param {File} file - 원본 이미지 파일
 * @returns {Promise<File>} - 압축된 WebP 이미지 파일 객체
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_WIDTH = 860;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Canvas to Blob 변환 실패'));
          }
        }, 'image/webp', 0.8);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * HTML 형식과 일반 텍스트 형식을 동시에 클립보드에 기록하여,
 * 네이버 스마트에디터 등 외부 에디터에 붙여넣을 때 서식(볼드, 소제목, 구분선)이 유지되도록 합니다.
 * @param {string} htmlText - 복사할 HTML 문자열
 * @returns {Promise<boolean>} - 복사 성공 여부
 */
export async function copyHtmlToClipboard(htmlText) {
  try {
    // HTML 태그를 제거하여 일반 텍스트 버전 생성 (줄바꿈 디테일 유지)
    const textPlain = htmlText
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .trim();

    const blobHtml = new Blob([htmlText], { type: 'text/html' });
    const blobText = new Blob([textPlain], { type: 'text/plain' });

    const data = [
      new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      })
    ];

    await navigator.clipboard.write(data);
    return true;
  } catch (err) {
    console.error('서식 복사 실패:', err);
    throw err;
  }
}