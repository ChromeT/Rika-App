import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadToFirebaseStorage = async (uri, userId) => {
  console.log('Uploading to Firebase Storage...', uri.substring(0, 50));
  
  try {
    // Fetch blob dari URI (baik blob: atau file:)
    const response = await fetch(uri);
    const blob = await response.blob();
    console.log('Blob size:', blob.size);
    
    // Buat reference di storage
    const filename = uri.split('/').pop() || 'media.jpg';
    const path = `users/${userId}/memories/${Date.now()}_${filename}`;
    const storageRef = ref(storage, path);
    
    // Upload blob
    console.log('Uploading to path:', path);
    await uploadBytes(storageRef, blob);
    
    // Dapatkan download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('Upload success:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Firebase Storage upload failed:', error);
    throw error;
  }
};

export const uploadMultipleToFirebaseStorage = async (mediaList, userId) => {
  const results = [];
  
  for (let i = 0; i < mediaList.length; i++) {
    const media = mediaList[i];
    try {
      const url = await uploadToFirebaseStorage(media.uri, userId);
      results.push({
        url,
        type: media.type,
        caption: media.caption || '',
      });
    } catch (error) {
      console.error('Failed upload media ' + i + ':', error);
    }
  }
  
  return results;
};
