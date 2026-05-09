import { compressImage } from './imageCompress';

export const saveMediaToFirestore = async (mediaList, goalId, updateGoal) => {
  const results = [];
  
  for (let i = 0; i < mediaList.length; i++) {
    const media = mediaList[i];
    try {
      // Compress dan convert ke base64
      const base64 = await compressImage(media.uri);
      results.push({
        url: base64, // base64 data URI
        type: media.type || 'image',
        caption: media.caption || '',
        isLocal: true, // flag bahwa ini base64 lokal
      });
    } catch (error) {
      console.error('Failed compress media ' + i + ':', error);
    }
  }
  
  return results;
};