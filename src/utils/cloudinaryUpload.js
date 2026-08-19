import { Platform } from 'react-native';
import { CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_BASE_URL } from '../config/cloudinary';

export const uploadToCloudinary = async (uri, mediaType, onProgress) => {
  if (!mediaType) mediaType = 'image';
  console.log('=== CLOUDINARY UPLOAD START ===');
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    let fileName = uri.split('/').pop() || `upload.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
    const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const endpoint = mediaType === 'video' ? 'video' : 'image';
    const url = CLOUDINARY_BASE_URL + '/' + endpoint + '/upload';

    xhr.open('POST', url);

    // To fix jumpy progress on React Native, simulate smooth progress up to 90%
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      if (simulatedProgress < 90) {
        simulatedProgress += 5;
        if (onProgress) onProgress(simulatedProgress);
      }
    }, 200);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const actualProgress = Math.min(100, Math.round((event.loaded / event.total) * 100));
          if (actualProgress > simulatedProgress) {
            simulatedProgress = actualProgress;
            onProgress(simulatedProgress);
          }
        }
      };
    }

    xhr.onload = () => {
      clearInterval(progressInterval);
      if (onProgress) onProgress(100);
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('=== UPLOAD SUCCESS ===');
          resolve(response.secure_url);
        } else {
          reject(new Error(response.error?.message || 'Upload failed'));
        }
      } catch (e) {
        reject(new Error('Failed to parse response'));
      }
    };

    xhr.onerror = () => {
      clearInterval(progressInterval);
      reject(new Error('Network error'));
    };

    const sendXhr = () => {
      xhr.send(formData);
    };

    if (uri.startsWith('data:')) {
      formData.append('file', uri);
      sendXhr();
    } else {
      if (Platform.OS === 'web' || uri.startsWith('blob:')) {
        fetch(uri)
          .then(res => res.blob())
          .then(blob => {
            formData.append('file', blob, fileName);
            sendXhr();
          })
          .catch(err => reject(err));
      } else {
        formData.append('file', { uri, name: fileName, type: mimeType });
        sendXhr();
      }
    }
  });
};

export const uploadMultipleToCloudinary = async (mediaList, onProgress) => {
  const results = [];
  for (let i = 0; i < mediaList.length; i++) {
    const media = mediaList[i];
    try {
      // Panggil upload dengan callback progres per item
      const url = await uploadToCloudinary(media.uri, media.type, (percent) => {
        if (onProgress) {
          onProgress(i, percent); // Kasih tau index ke-berapa dan berapa persen
        }
      });
      
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