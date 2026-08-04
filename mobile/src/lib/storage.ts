import AsyncStorage from '@react-native-async-storage/async-storage'

export const STORAGE_KEYS = {
  pendingInvite: 'p2:pendingInvite',
} as const

export async function getPendingInvite(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.pendingInvite)
  } catch {
    return null
  }
}

export async function setPendingInvite(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.pendingInvite, code)
  } catch {
    /* ignore */
  }
}

export async function clearPendingInvite(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.pendingInvite)
  } catch {
    /* ignore */
  }
}
