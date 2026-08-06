import type {
  BrokerOrderRequest,
  BrokerOrderResponse,
} from './brokerConnector';

export interface DemoOrderHistoryItem {
  id: string;
  request: BrokerOrderRequest;
  response: BrokerOrderResponse;
  createdAt: number;
}

const STORAGE_KEY =
  'tradevision-demo-order-history';

function loadHistory():
  DemoOrderHistoryItem[] {
  if (
    typeof window === 'undefined'
  ) {
    return [];
  }

  try {
    const saved =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as DemoOrderHistoryItem[];
  } catch {
    return [];
  }
}

function saveHistory(
  history: DemoOrderHistoryItem[],
): void {
  if (
    typeof window === 'undefined'
  ) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(history),
  );
}

export function getDemoOrderHistory():
  DemoOrderHistoryItem[] {
  return loadHistory();
}

export function addDemoOrderHistory(
  request: BrokerOrderRequest,
  response: BrokerOrderResponse,
): DemoOrderHistoryItem {
  const item: DemoOrderHistoryItem = {
    id:
      response.brokerOrderId ??
      request.clientOrderId,
    request,
    response,
    createdAt:
      response.sentAt ??
      Date.now(),
  };

  const current =
    loadHistory();

  const next = [
    item,
    ...current,
  ].slice(0, 100);

  saveHistory(next);

  return item;
}

export function clearDemoOrderHistory():
  void {
  saveHistory([]);
}