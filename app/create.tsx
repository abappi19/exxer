import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { database } from '@/src/db/database';
import { Todo } from '@/src/db/models';
import { useSync } from '@/src/hooks/useSync';
import { useImagePicker } from '@/src/image/useImagePicker';

export default function CreateTodoScreen() {
    const router = useRouter();
    const { triggerSync } = useSync();
    const { imageUri, pickImage, clearImage } = useImagePicker();

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!title.trim()) {
            Alert.alert('Title required', 'Please enter a title for your todo.');
            return;
        }

        setSaving(true);
        try {
            await database.write(async () => {
                await database.get<Todo>('todos').create((record) => {
                    record.title = title.trim();
                    record.body = body.trim();
                    record.isDone = false;
                    record.imageLocalUri = imageUri || '';
                    record.imageRemoteUrl = '';
                    record.imageUploadStatus = imageUri ? 'pending' : 'none';
                });
            });

            // Trigger sync in background (don't block navigation)
            triggerSync();
            router.back();
        } catch (error) {
            console.error('Failed to create todo:', error);
            Alert.alert('Error', 'Failed to create todo.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                    style={styles.input}
                    placeholder="What needs to be done?"
                    placeholderTextColor="#636366"
                    value={title}
                    onChangeText={setTitle}
                    autoFocus
                />

                <Text style={styles.label}>Details</Text>
                <TextInput
                    style={[styles.input, styles.bodyInput]}
                    placeholder="Add some details…"
                    placeholderTextColor="#636366"
                    value={body}
                    onChangeText={setBody}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />

                <Text style={styles.label}>Image (optional)</Text>
                {imageUri ? (
                    <View style={styles.imagePreview}>
                        <Image source={{ uri: imageUri }} style={styles.image} />
                        <TouchableOpacity style={styles.removeImage} onPress={clearImage}>
                            <Text style={styles.removeImageText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
                        <Text style={styles.pickButtonText}>📷  Pick an image</Text>
                    </TouchableOpacity>
                )}

                {imageUri && (
                    <Text style={styles.hint}>
                        Image will be queued for upload. It will upload when you're online.
                    </Text>
                )}

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.savingButton]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <Text style={styles.saveButtonText}>
                        {saving ? 'Saving…' : 'Save Todo'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scroll: {
        padding: 20,
        paddingBottom: 60,
    },
    label: {
        color: '#8E8E93',
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#1C1C1E',
        color: '#F2F2F7',
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#38383A',
    },
    bodyInput: {
        minHeight: 100,
    },
    pickButton: {
        backgroundColor: '#1C1C1E',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#38383A',
        borderStyle: 'dashed',
    },
    pickButtonText: {
        color: '#0A84FF',
        fontSize: 15,
        fontWeight: '600',
    },
    imagePreview: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 12,
    },
    removeImage: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeImageText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    hint: {
        color: '#FF9F0A',
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
    },
    saveButton: {
        backgroundColor: '#0A84FF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 32,
    },
    savingButton: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});
