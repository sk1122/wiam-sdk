export enum WiamEventName {
	WALLET_CONNECTED = 'wallet_connected',
	WALLET_REMOVED = 'wallet_removed',
	PAGE_VIEWED = 'page_viewed',
	TRANSACTION_EXECUTED = 'transaction_executed'
} 

export interface WiamEvent {
	name: WiamEventName | string
	data: any
}

export interface Opts {
	serviceWorker: string
	recordPageViews: boolean
}