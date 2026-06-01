import { Coin } from "qapp-core";

export type TransactionType =
    | "GENESIS"
    | "PAYMENT"
    | "REGISTER_NAME"
    | "UPDATE_NAME"
    | "SELL_NAME"
    | "CANCEL_SELL_NAME"
    | "BUY_NAME"
    | "CREATE_POLL"
    | "VOTE_ON_POLL"
    | "ARBITRARY"
    | "ISSUE_ASSET"
    | "TRANSFER_ASSET"
    | "CREATE_ASSET_ORDER"
    | "CANCEL_ASSET_ORDER"
    | "MULTI_PAYMENT"
    | "DEPLOY_AT"
    | "MESSAGE"
    | "CHAT"
    | "PUBLICIZE"
    | "AIRDROP"
    | "AT"
    | "CREATE_GROUP"
    | "UPDATE_GROUP"
    | "ADD_GROUP_ADMIN"
    | "REMOVE_GROUP_ADMIN"
    | "GROUP_BAN"
    | "CANCEL_GROUP_BAN"
    | "GROUP_KICK"
    | "GROUP_INVITE"
    | "CANCEL_GROUP_INVITE"
    | "JOIN_GROUP"
    | "LEAVE_GROUP"
    | "GROUP_APPROVAL"
    | "SET_GROUP"
    | "UPDATE_ASSET"
    | "ACCOUNT_FLAGS"
    | "ENABLE_FORGING"
    | "REWARD_SHARE"
    | "ACCOUNT_LEVEL"
    | "TRANSFER_PRIVS"
    | "PRESENCE";

export interface SearchTransactionsResponse {
    type: TransactionType;
    timestamp: number;
    reference: string;
    fee: string;
    signature: string;
    txGroupId: number;
    blockHeight: number;
    approvalStatus: string;
    creatorAddress: string;
    creatorAddressOriginal?: string;
    senderPublicKey: string;
    recipient: string;
    recipientOriginal?: string;
    amount: string;
}

export interface AddressBookEntry {
    id: string;                    // Unique identifier (UUID or timestamp-based)
    name: string;                  // Max 50 chars
    address: string;               // Coin-specific length
    note: string;                  // Max 200 chars
    coinType: Coin;                // e.g., 'BTC', 'DOGE', 'LTC'
    createdAt: number;             // Unix timestamp
    updatedAt?: number;            // Unix timestamp (optional)
}
