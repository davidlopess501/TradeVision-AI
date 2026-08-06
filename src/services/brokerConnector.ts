import type {
  Asset,
} from '@/types';

import type {
  PreparedOrder,
} from './orderManager';

export type BrokerEnvironment =
  | 'DEMO'
  | 'REAL';

export type BrokerConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR';

export type BrokerOrderStatus =
  | 'ACCEPTED'
  | 'REJECTED'
  | 'NOT_SENT';

export interface BrokerAccount {
  id: string;
  name: string;
  environment: BrokerEnvironment;
  balance: number;
  availableMargin: number;
}

export interface BrokerStatus {
  name: string;
  connectionStatus:
    BrokerConnectionStatus;
  environment:
    BrokerEnvironment;
  connectedAt:
    number | null;
  message: string;
}

export interface BrokerOrderRequest {
  clientOrderId: string;
  asset: Asset;
  side: 'BUY' | 'SELL';
  quantity: number;
  entry: number;
  stop: number;
  target: number;
}

export interface BrokerOrderResponse {
  status: BrokerOrderStatus;
  brokerOrderId:
    string | null;
  message: string;
  sentAt:
    number | null;
}

export interface IBrokerConnector {
  readonly name: string;

  connect():
    Promise<BrokerStatus>;

  disconnect():
    Promise<void>;

  getStatus():
    BrokerStatus;

  getAccount():
    Promise<BrokerAccount | null>;

  validateOrder(
    order: PreparedOrder,
  ): Promise<{
    valid: boolean;
    message: string;
  }>;

  sendOrder(
    request: BrokerOrderRequest,
  ): Promise<BrokerOrderResponse>;
}