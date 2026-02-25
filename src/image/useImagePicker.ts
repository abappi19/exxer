import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

interface UseImagePickerResult {
    /** URI of the selected image, or null. */
    imageUri: string | null;
    /** Whether the picker is currently open. */
    isLoading: boolean;
    /** Launch the image picker. Returns the selected URI or null. */
    pickImage: () => Promise<string | null>;
    /** Clear the selected image. */
    clearImage: () => void;
}

/**
 * Hook wrapping expo-image-picker.
 * Returns a local file URI for the selected image.
 */
export function useImagePicker(): UseImagePickerResult {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const pickImage = useCallback(async (): Promise<string | null> => {
        setIsLoading(true);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                setImageUri(uri);
                return uri;
            }
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearImage = useCallback(() => {
        setImageUri(null);
    }, []);

    return { imageUri, isLoading, pickImage, clearImage };
}
