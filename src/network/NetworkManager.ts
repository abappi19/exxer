import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/** Thin wrapper around NetInfo for network awareness. */
export class NetworkManager {
    /** Check if the device is currently online. */
    static async isOnline(): Promise<boolean> {
        const state: NetInfoState = await NetInfo.fetch();
        return state.isConnected === true && state.isInternetReachable !== false;
    }

    /** Subscribe to connectivity changes. Returns an unsubscribe function. */
    static subscribe(callback: (isOnline: boolean) => void) {
        return NetInfo.addEventListener((state: NetInfoState) => {
            callback(state.isConnected === true && state.isInternetReachable !== false);
        });
    }
}
