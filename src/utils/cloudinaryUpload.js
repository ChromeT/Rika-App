import { CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_BASE_URL } from '../config/cloudinary';

export const uploadToCloudinary = async (uri, mediaType) => {
  if (!mediaType) mediaType = 'image';
  console.log('=== CLOUDINARY UPLOAD START ===');
  console.log('URI:', uri.substring(0, 50));
  
  try {
    // For React Native and web, we need to handle both data URLs and local blob/file URIs.
    const formData = new FormData();
    let fileName = uri.split('/').pop();
    if (!fileName) {
      fileName = `upload.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
    }
    const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
    if (uri.startsWith('data:')) {
      // Data URL – Cloudinary accepts it directly as a string.
      formData.append('file', uri);
    } else if (uri.startsWith('blob:') || uri.startsWith('http')) {
      // Web blob URL or remote URL – fetch the blob and append it.
      console.log('Fetching blob from URI...');
      const resp = await fetch(uri);
      if (!resp.ok) throw new Error('Failed to fetch blob: ' + resp.status);
      const blob = await resp.blob();
      formData.append('file', blob, fileName);
    } else {
      // Native file URI – provide an object with uri, name, and MIME type.
      // @ts-ignore – FormData can accept plain objects in React Native.
      formData.append('file', { uri, name: fileName, type: mimeType });
    }
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const endpoint = mediaType === 'video' ? 'video' : 'image';
    const url = CLOUDINARY_BASE_URL + '/' + endpoint + '/upload';
    console.log('POST to Cloudinary:', url);
    const response = await fetch(url, { method: 'POST', body: formData });

    const responseText = await response.text();
    console.log('Cloudinary response status:', response.status);
    console.log('Cloudinary response (truncated):', responseText.substring(0, 300));
    const data = JSON.parse(responseText);
    if (data.error) {
      console.error('Cloudinary error details:', data.error);
      throw new Error(data.error.message || JSON.stringify(data.error));
    }
    console.log('=== UPLOAD SUCCESS ===');
    console.log('Secure URL:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('=== UPLOAD FAILED ===');
    console.error('Error message:', error.message);
    throw error;
  }
};

export const uploadMultipleToCloudinary = async (mediaList) => {
  const results = [];
  for (let i = 0; i < mediaList.length; i++) {
    const media = mediaList[i];
    try {
      const url = await uploadToCloudinary(media.uri, media.type);
      results.push({
        url: url,
        type: media.type,
        caption: media.caption || '',
      });
    } catch (error) {
      console.error('Failed upload media ' + i + ':', error.message);
    }
  }
  return results;
};