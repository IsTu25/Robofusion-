type MessageCallback = (data: any) => void;

export class DashboardWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;
  private listeners: Set<MessageCallback> = new Set();
  private intentionalClose = false;

  constructor(token: string) {
    this.token = token;
    // Replace http:// with ws:// for the WS connection
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    let wsBase = baseUrl.replace(/^http/, 'ws');
    // Force IPv4 to prevent browser IPv6 resolution issues when docker is only bound to 0.0.0.0
    wsBase = wsBase.replace('localhost', '127.0.0.1');
    this.url = `${wsBase}/ws`;
  }

  connect() {
    this.intentionalClose = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("WebSocket connected to dashboard");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach(callback => callback(data));
      } catch (e) {
        console.error("Error parsing WS message:", e);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      if (!this.intentionalClose) {
        this.reconnect();
      }
    };

    this.ws.onerror = (error) => {
      if (!this.intentionalClose) {
        console.error("WebSocket error:", error);
      }
    };
  }

  subscribe(callback: MessageCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max WebSocket reconnect attempts reached.");
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Reconnecting in ${delay}ms...`);
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
