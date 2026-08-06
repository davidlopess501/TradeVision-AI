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

function uid(): string {
  return (
    crypto.randomUUID?.() ??
    `${Math.random()
      .toString(36)
      .slice(2)}-${Date.now()}`
  );
}

export class DemoBrokerConnector
  implements IBrokerConnector
{
  readonly name =
    'TradeVision Demo Broker';

  private status: BrokerStatus = {
    name: this.name,
    connectionStatus:
      'DISCONNECTED',
    environment: 'DEMO',
    connectedAt: null,
    message:
      'Conta demo desconectada.',
  };

  async connect():
    Promise<BrokerStatus> {
    this.status = {
      ...this.status,
      connectionStatus:
        'CONNECTING',
      message:
        'Conectando à conta demo...',
    };

    await new Promise<void>(
      (resolve) => {
        window.setTimeout(
          resolve,
          500,
        );
      },
    );

    this.status = {
      name: this.name,
      connectionStatus:
        'CONNECTED',
      environment: 'DEMO',
      connectedAt: Date.now(),
      message:
        'Conta demo conectada. Nenhuma ordem real será enviada.',
    };

    return this.status;
  }

  async disconnect():
    Promise<void> {
    this.status = {
      name: this.name,
      connectionStatus:
        'DISCONNECTED',
      environment: 'DEMO',
      connectedAt: null,
      message:
        'Conta demo desconectada.',
    };
  }

  getStatus():
    BrokerStatus {
    return this.status;
  }

  async getAccount():
    Promise<BrokerAccount | null> {
    if (
      this.status
        .connectionStatus !==
      'CONNECTED'
    ) {
      return null;
    }

    return {
      id: 'demo-account',
      name: 'Conta Demo',
      environment: 'DEMO',
      balance: 10000,
      availableMargin: 10000,
    };
  }

  async validateOrder(
    order: PreparedOrder,
  ): Promise<{
    valid: boolean;
    message: string;
  }> {
    if (
      this.status
        .connectionStatus !==
      'CONNECTED'
    ) {
      return {
        valid: false,
        message:
          'A conta demo não está conectada.',
      };
    }

    if (
      order.status !== 'READY' ||
      !order.side
    ) {
      return {
        valid: false,
        message:
          'A ordem não está pronta para envio.',
      };
    }

    return {
      valid: true,
      message:
        'Ordem validada para simulação.',
    };
  }

  async sendOrder(
    request: BrokerOrderRequest,
  ): Promise<BrokerOrderResponse> {
    if (
      this.status
        .connectionStatus !==
      'CONNECTED'
    ) {
      return {
        status: 'NOT_SENT',
        brokerOrderId: null,
        message:
          'Conta demo desconectada.',
        sentAt: null,
      };
    }

    return {
      status: 'ACCEPTED',
      brokerOrderId: uid(),
      message:
        `Ordem demo de ${request.quantity} contrato(s) aceita. Nenhuma ordem real foi enviada.`,
      sentAt: Date.now(),
    };
  }
}