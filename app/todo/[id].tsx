import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { database } from '@/src/db/database';
import { Todo } from '@/src/db/models';
import { useSync } from '@/src/hooks/useSync';
import { imageUploadService } from '@/src/image/ImageUploadService';
import { syncOrchestrator } from '@/src/sync/SyncOrchestrator';

export default function TodoDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { triggerSyncOne } = useSync();
    const [todo, setTodo] = useState<Todo | null>(null);

    useEffect(() => {
        if (!id) return;

        // Reactive subscription to local DB
        const subscription = database
            .get<Todo>('todos')
            .findAndObserve(id)
            .subscribe({
                next: (record) => setTodo(record),
                error: (err) => {
                    console.error('Todo not found:', err);
                    router.back();
                },
            });

        // On-demand fetch from server (Lazy Sync)
        triggerSyncOne(id);

        return () => subscription.unsubscribe();
    }, [id, triggerSyncOne]);

    if (!todo) {
        return (
            <View style={styles.container}>
                <Text style={styles.loading}>Loading…</Text>
            </View>
        );
    }

    const imageUri = todo.imageUri;

    async function handleToggle() {
        if (!todo) return;
        await database.write(async () => {
            await todo.update((r) => {
                r.isDone = !r.isDone;
                r.manualSyncStatus = 'pending';
            });
        });
        syncOrchestrator.triggerSync();
        imageUploadService.processPendingUploads();
    }

    async function handleDelete() {
        if (!todo) return;
        Alert.alert('Delete Todo', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await database.write(async () => {
                        await todo.markAsDeleted();
                    });
                    syncOrchestrator.triggerSync();
                    router.back();
                },
            },
        ]);
    }

    const uploadBadge =
        todo.imageUploadStatus === 'pending'
            ? '📤 Image upload pending (will upload when online)'
            : todo.imageUploadStatus === 'done'
                ? '✅ Image uploaded'
                : null;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Status */}
            <View style={styles.statusRow}>
                <TouchableOpacity
                    style={[styles.statusChip, todo.isDone && styles.statusDone]}
                    onPress={handleToggle}
                >
                    <Text style={styles.statusText}>
                        {todo.isDone ? '✓ Done' : '○ Todo'}
                    </Text>
                </TouchableOpacity>

                {todo.syncState !== 'synced' && (
                    <View style={styles.syncLabel}>
                        <Text style={[
                            styles.syncLabelText,
                            todo.syncState === 'error' && styles.errorLabelText
                        ]}>
                            {todo.syncState === 'error' ? '✖ Sync Failed' : '⏳ Pending Sync'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Title */}
            <Text style={styles.title}>{todo.title}</Text>

            {/* Body */}
            {todo.body ? <Text style={styles.body}>{todo.body}</Text> : null}

            {/* Image */}
            {imageUri ? (
                <View style={styles.imageContainer}>
                    <Image source={{ uri: imageUri }} style={styles.image} />
                    {uploadBadge && (
                        <Text style={styles.uploadBadge}>{uploadBadge}</Text>
                    )}
                </View>
            ) : null}

            {/* Timestamps */}
            <View style={styles.meta}>
                <Text style={styles.metaText}>
                    Created: {todo.createdAt.toLocaleString()}
                </Text>
                <Text style={styles.metaText}>
                    Updated: {todo.updatedAt.toLocaleString()}
                </Text>
                {todo.syncError && (
                    <Text style={styles.errorText}>
                        Last Sync Error: {todo.syncError}
                    </Text>
                )}
            </View>

            {/* Delete */}
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteText}>Delete Todo</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    loading: {
        color: '#8E8E93',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 40,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#2C2C2E',
    },
    statusDone: {
        backgroundColor: '#34C75930',
    },
    statusText: {
        color: '#F2F2F7',
        fontSize: 14,
        fontWeight: '600',
    },
    syncLabel: {
        marginLeft: 12,
    },
    syncLabelText: {
        color: '#FF9F0A',
        fontSize: 12,
        fontWeight: '500',
    },
    errorLabelText: {
        color: '#FF3B30',
    },
    title: {
        color: '#F2F2F7',
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 12,
    },
    body: {
        color: '#AEAEB2',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 20,
    },
    imageContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    image: {
        width: '100%',
        height: 240,
    },
    uploadBadge: {
        color: '#FF9F0A',
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
    },
    meta: {
        backgroundColor: '#1C1C1E',
        borderRadius: 10,
        padding: 14,
        marginBottom: 24,
    },
    metaText: {
        color: '#636366',
        fontSize: 12,
        marginBottom: 4,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 4,
    },
    deleteButton: {
        backgroundColor: '#FF3B301A',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    deleteText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '700',
    },
});
