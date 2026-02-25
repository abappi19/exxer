import { withObservables } from '@nozbe/watermelondb/react';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Todo } from '../db/models';

interface TodoItemProps {
    todo: Todo;
    onPress?: (todo: Todo) => void;
    onToggle?: (todo: Todo) => void;
}

/** A single todo item — reactively updates when the record changes. */
function TodoItemRaw({ todo, onPress, onToggle }: TodoItemProps) {
    const imageUri = todo.imageUri;

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
                    <Text style={styles.body} numberOfLines={2}>
                        {todo.body}
                    </Text>
                ) : null}

                {/* Image upload status badge */}
                {todo.imageUploadStatus === 'pending' && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>📤 Upload pending</Text>
                    </View>
                )}
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
        marginTop: 4,
    },
    badge: {
        marginTop: 6,
        backgroundColor: '#FF9F0A22',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        color: '#FF9F0A',
        fontSize: 11,
        fontWeight: '600',
    },
    thumbnail: {
        width: 48,
        height: 48,
        borderRadius: 8,
        marginLeft: 10,
    },
});
