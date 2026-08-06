import type {
  BrokerAccount,
  BrokerOrderRequest,
  BrokerOrderResponse,
  BrokerStatus,
  IBrokerConnector,
} from './brokerConnector';

import type {
  PreparedOrder,
} from './orderManager';

import {
  DemoBrokerConnector,
} from './demoBrokerConnector';

const demoConnector =
  new DemoBrokerConnector();

let activeConnector:
  IBrokerConnector =
    demoConnector;

export function getActiveBrokerConnector():
  IBrokerConnector {
  return activeConnector;
}

export function setActiveBrokerConnector(
  connector: IBrokerConnector,
): void {
  activeConnector = connector;
}

export async function connectBroker():
  Promise<BrokerStatus> {
  return activeConnector.connect();
}

export async function disconnectBroker():
  Promise<void> {
  await activeConnector.disconnect();
}

export function getBrokerStatus():
  BrokerStatus {
  return activeConnector.getStatus();
}

export async function getBrokerAccount():
  Promise<BrokerAccount | null> {
  return activeConnector.getAccount();
}

export async function validateBrokerOrder(
  order: PreparedOrder,
): Promise<{
  valid: boolean;
  message: string;
}> {
  return activeConnector.validateOrder(
    order,
  );
}

export async function sendBrokerOrder(
  request: BrokerOrderRequest,
): Promise<BrokerOrderResponse> {
  return activeConnector.sendOrder(
    request,
  );
}