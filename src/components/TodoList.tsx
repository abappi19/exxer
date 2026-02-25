import { withObservables } from '@nozbe/watermelondb/react';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { database } from '../db/database';
import { Todo } from '../db/models';
import { TodoItem } from './TodoItem';

interface TodoListProps {
    todos: Todo[];
    onPressTodo?: (todo: Todo) => void;
    onToggleTodo?: (todo: Todo) => void;
}

function TodoListRaw({ todos, onPressTodo, onToggleTodo }: TodoListProps) {
    if (todos.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No todos yet</Text>
                <Text style={styles.emptySubtitle}>Tap + to create your first todo</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={todos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <TodoItem
                    todo={item}
                    onPress={onPressTodo}
                    onToggle={onToggleTodo}
                />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
        />
    );
}

const enhance = withObservables([], () => ({
    todos: database.get<Todo>('todos').query().observe(),
}));

export const TodoList = enhance(TodoListRaw);

const styles = StyleSheet.create({
    list: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        color: '#F2F2F7',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: '#8E8E93',
        fontSize: 14,
        textAlign: 'center',
    },
});
