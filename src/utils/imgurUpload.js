export const uploadToImgur = async (uri) => {
  console.log('Uploading to Imgur...', uri.substring(0, 30));
  
  try {
    // Convert ke base64
    let base64;
    if (uri.startsWith('data:')) {
      base64 = uri;
    } else {
      const response = await fetch(uri);
      const blob = await response.blob();
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    
    // Upload ke Imgur (anonymous)
    const formData = new FormData();
    formData.append('image', base64);
    
    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': 'Client-ID 1d549b641d90b2f',
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.data.error || 'Upload failed');
    }
    
    console.log('Imgur upload success:', data.data.link);
    return data.data.link;
  } catch (error) {
    console.error('Imgur upload failed:', error);
    throw error;
  }
};

export const uploadMultipleToImgur = async (mediaList) => {
  const results = [];
  
  for (let i = 0; i < mediaList.length; i++) {
    const media = mediaList[i];
    try {
      const url = await uploadToImgur(media.uri);
      results.push({
        url,
        type: media.type || 'image',
        caption: media.caption || '',
      });
    } catch (error) {
      console.error('Failed upload media ' + i + ':', error);
    }
  }
  
  return results;
};
