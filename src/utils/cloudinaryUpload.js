import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_BASE_URL } from '../config/cloudinary';

export const uploadToCloudinary = async (uri, mediaType, onProgress) => {
  if (!mediaType) mediaType = 'image';
  console.log('=== CLOUDINARY UPLOAD START ===');
  
  let fileName = uri.split('/').pop() || `upload.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
  const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
  const endpoint = mediaType === 'video' ? 'video' : 'image';
  const url = CLOUDINARY_BASE_URL + '/' + endpoint + '/upload';

  if (Platform.OS !== 'web' && !uri.startsWith('data:')) {
    // Native upload via expo-file-system for accurate progress
    return new Promise((resolve, reject) => {
      const uploadTask = FileSystem.createUploadTask(
        url,
        uri,
        {
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: mimeType,
          parameters: {
            upload_preset: CLOUDINARY_UPLOAD_PRESET,
          },
        },
        (data) => {
          if (onProgress && data.totalByteSent && data.totalBytesExpectedToSend) {
            const progress = Math.min(100, Math.round((data.totalByteSent / data.totalBytesExpectedToSend) * 100));
            onProgress(progress);
          }
        }
      );
      
      uploadTask.uploadAsync().then(response => {
        if (response.status >= 200 && response.status < 300) {
          const resBody = JSON.parse(response.body);
          console.log('=== UPLOAD SUCCESS ===');
          resolve(resBody.secure_url);
        } else {
          reject(new Error('Upload failed with status ' + response.status));
        }
      }).catch(reject);
    });
  }

  // Web Fallback via XHR
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    xhr.open('POST', url);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
          console.log(`[Cloudinary XHR] loaded: ${event.loaded}, total: ${event.total}, calculated progress: ${progress}`);
          onProgress(progress);
        }
      };
    }

    xhr.onload = () => {
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

    xhr.onerror = () => reject(new Error('Network error'));

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