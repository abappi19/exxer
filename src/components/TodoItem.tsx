import { withObservables } from '@nozbe/watermelondb/react';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Todo, TodoSyncStatus } from '../db/models/Todo';
import { manualSyncService } from '../sync/ManualSyncService';

interface TodoItemProps {
    todo: Todo;
    onPress?: (todo: Todo) => void;
    onToggle?: (todo: Todo) => void;
}

/** A single todo item — reactively updates when the record changes. */
function TodoItemRaw({ todo, onPress, onToggle }: TodoItemProps) {
    const imageUri = todo.imageUri;

    // Map sync status to readable text
    const getSyncStatusText = (status: TodoSyncStatus, hasError: boolean) => {
        if (hasError) return '✖ Sync Failed';
        switch (status) {
            case 'synced': return '✓ Synced';
            case 'created':
            case 'updated': return '⏳ Pending Sync';
            case 'deleted': return '🗑 Deleting...';
            default: return 'Unknown';
        }
    };

    const isPending = todo.syncStatus !== 'synced' && !todo.syncError;
    const hasError = !!todo.syncError;

    return (
        <TouchableOpacity
            style={[styles.container, todo.isDone && styles.doneContainer]}
            onPress={() => onPress?.(todo)}
            activeOpacity={0.7}
        >
            <TouchableOpacity
                style={[styles.checkbox, todo.isDone && styles.checkedBox]}
                onPress={() => onToggle?.(todo)}
            >
                {todo.isDone && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <View style={styles.content}>
                <Text style={[styles.title, todo.isDone && styles.doneTitle]}>
                    {todo.title}
                </Text>

                {todo.body ? (
                    <Text style={styles.body} numberOfLines={1}>
                        {todo.body}
                    </Text>
                ) : null}

                <View style={styles.statusRow}>
                    <View style={styles.statusBadgeContainer}>
                        <Text style={[
                            styles.syncStatus,
                            isPending && styles.syncPending,
                            hasError && styles.syncError
                        ]}>
                            {getSyncStatusText(todo.syncStatus, hasError)}
                        </Text>

                        {hasError && (
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => manualSyncService.retryTodo(todo)}
                            >
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Image Status Badge */}
                    {todo.imageUploadStatus === 'pending' && (
                        <Text style={styles.imageBadge}> • 📤 Image pending</Text>
                    )}
                </View>
            </View>

            {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.thumbnail} />
            ) : null}
        </TouchableOpacity>
    );
}

/** withObservables enhancer — re-renders when the observed todo record changes. */
const enhance = withObservables(['todo'], ({ todo }: { todo: Todo }) => ({
    todo: todo.observe(),
}));

export const TodoItem = enhance(TodoItemRaw);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },
    doneContainer: {
        opacity: 0.6,
    },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: '#636366',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkedBox: {
        backgroundColor: '#34C759',
        borderColor: '#34C759',
    },
    checkmark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    },
    title: {
        color: '#F2F2F7',
        fontSize: 16,
        fontWeight: '600',
    },
    doneTitle: {
        textDecorationLine: 'line-through',
        color: '#8E8E93',
    },
    body: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    syncStatus: {
        fontSize: 11,
        color: '#34C759',
        fontWeight: '600',
    },
    syncPending: {
        color: '#FF9F0A',
    },
    syncError: {
        color: '#FF3B30',
    },
    retryButton: {
        marginLeft: 8,
        backgroundColor: '#FF3B3020',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    retryButtonText: {
        color: '#FF3B30',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    imageBadge: {
        fontSize: 11,
        color: '#8E8E93',
    },
    thumbnail: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginLeft: 10,
    },
});
