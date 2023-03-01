export enum WiamEventName {
	WALLET_CONNECTED = 'wallet_connected',
	WALLET_REMOVED = 'wallet_removed',
	PAGE_VIEWED = 'page_viewed'
} 

export interface WiamEvent {
	name: WiamEventName
	data: any
}