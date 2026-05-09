import * as ImageManipulator from 'expo-image-manipulator';

export const compressImage = async (uri) => {
  try {
    console.log('Compressing image...', uri.substring(0, 30));
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], // Resize ke width maks 800px
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    console.log('Compressed, base64 length:', result.base64?.length);
    return 'data:image/jpeg;base64,' + result.base64;
  } catch (error) {
    console.error('Compression failed:', error);
    throw error;
  }
};