// 부적절한 콘텐츠 필터링 (비속어/욕설 감지)
const badWords = [
  // 한국어 비속어
  '시발',
  '씨발',
  '시bal',
  'ㅅㅂ',
  'ㅆㅂ',
  '병신',
  'ㅂㅅ',
  '지랄',
  'ㅈㄹ',
  '개새끼',
  '새끼',
  'ㅅㄲ',
  '미친놈',
  '미친년',
  '꺼져',
  '닥쳐',
  '죽어',
  '엿먹어',
  '좆',
  'ㅈ같',
  '씹',
  '개같',
  '찐따',
  '한남',
  '한녀',
  '느금마',
  // 영어 비속어
  'fuck',
  'shit',
  'damn',
  'asshole',
  'bitch',
];

// 텍스트에 비속어가 포함되어 있는지 검사
export const containsBadWord = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return badWords.some((word) => lower.includes(word.toLowerCase()));
};
