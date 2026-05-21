// 시스템 타이틀과 리스트 헤더 제거 함수
export function cleanDetailCopy(text) {
  if (!text) return "";
  
  // 정규식을 사용해 '**[요약 정보]**', '* **특징**' 등 각종 리스트/강조 헤더 필터링
  // 1. '[어쩌고]' 형태의 강조 헤더 제거 (예: **[요약 정보]**)
  let cleaned = text.replace(/\*\*\s*\[.*?\]\s*\*\*/g, '');
  
  // 2. '* **텍스트**' 형태의 리스트 강조 헤더 제거
  cleaned = cleaned.replace(/^\s*\*\s+\*\*(.*?)\*\*(:|-)?\s*/gm, '');
  
  // 3. 단순 '**텍스트**' 형태도 제거 (단락 앞부분에 위치할 경우)
  cleaned = cleaned.replace(/^\s*\*\*(.*?)\*\*(:|-)?\s*/gm, '');
  
  return cleaned.trim();
}

// 1~2글자의 파편화된 노이즈 데이터 제거 함수
export function filterRawCaptions(array) {
  if (!array || !Array.isArray(array)) return [];
  
  return array.filter(item => {
    if (typeof item !== 'string') return false;
    const trimmed = item.trim();
    // 1~2글자 이하의 단어는 노이즈로 간주하고 제거
    return trimmed.length > 2;
  });
}
