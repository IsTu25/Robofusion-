type MessageCallback = (data: any) => void;

export class DashboardWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private baseReconnectDelay = 1000;
  private listeners: Set<MessageCallback> = new Set();
  private intentionalClose = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

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
    
    // Clean up any existing connection
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("WebSocket connected to dashboard");
      this.reconnectAttempts = 0; // Reset on successful connection
      this.startPing();
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
      this.stopPing();
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

  private startPing() {
    this.stopPing();
    // Send a ping every 25 seconds to keep the connection alive through proxies/tunnels
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send("ping");
        } catch {
          // Will trigger onclose -> reconnect
        }
      }
    }, 25000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private reconnect() {
    // Always reconnect — never give up (capped at 30s delay)
    const delay = Math.min(30000, this.baseReconnectDelay * Math.pow(2, Math.min(this.reconnectAttempts, 4)));
    console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})...`);
    this.reconnectAttempts++;

    setTimeout(() => {
      if (!this.intentionalClose) {
        this.connect();
      }
    }, delay);
  }

  disconnect() {
    this.intentionalClose = true;
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
