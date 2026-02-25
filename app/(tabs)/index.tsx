import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TodoList } from '@/src/components/TodoList';
import { database } from '@/src/db/database';
import { Todo } from '@/src/db/models';
import { useSync } from '@/src/hooks/useSync';

export default function TodosScreen() {
  const router = useRouter();
  const { isSyncing, lastSyncedAt, triggerSync } = useSync();

  const handlePressTodo = useCallback(
    (todo: Todo) => {
      router.push(`/todo/${todo.id}`);
    },
    [router],
  );

  const handleToggleTodo = useCallback(async (todo: Todo) => {
    await database.write(async () => {
      await todo.update((record) => {
        record.isDone = !record.isDone;
      });
    });
  }, []);

  const syncText = isSyncing
    ? '⟳ Syncing…'
    : lastSyncedAt
      ? `✓ Synced ${lastSyncedAt.toLocaleTimeString()}`
      : 'Not synced';

  return (
    <View style={styles.container}>
      {/* Sync status banner */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{syncText}</Text>
        {!isSyncing && (
          <TouchableOpacity onPress={triggerSync}>
            <Text style={styles.syncButton}>Sync now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Todo list — reactive via withObservables */}
      <TodoList onPressTodo={handlePressTodo} onToggleTodo={handleToggleTodo} />

      {/* FAB — create todo */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  statusText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  syncButton: {
    color: '#0A84FF',
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
});
