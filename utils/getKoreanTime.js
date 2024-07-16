export const getKoreanTime = () => {
  const now = new Date();
  const koreanOffset = 9 * 60 * 60 * 1000; // 한국 시간은 UTC+9
  const koreanTime = new Date(now.getTime() + koreanOffset);
  return koreanTime;
};
