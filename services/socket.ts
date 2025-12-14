import { io, Socket } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://d-kjyc.onrender.com";

let socket: Socket | null = null;

export function initializeSocket(token: string): Socket | null {
  // Only initialize on client side
  if (typeof window === "undefined") {
    return null;
  }

  // If socket is already connected with the same token, return it
  if (socket?.connected) {
    // Check if we need to update the token
    const currentToken = (socket.auth as any)?.token;
    if (currentToken !== token) {
      // Token changed, need to reconnect
      disconnectSocket();
    } else {
      return socket;
    }
  }

  try {
    socket = io(API_BASE, {
      transports: ["polling", "websocket"], // Try polling first, then websocket
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 5000,
      forceNew: false,
      autoConnect: true,
    });

    // Set up error handlers immediately to catch all errors
    socket.on("connect", () => {
      console.log("✅ Socket.IO connected (Admin)");
    });

    socket.on("disconnect", (reason) => {
      // Don't log disconnects as errors - they're normal
      if (reason === "io server disconnect") {
        console.log("Socket.IO disconnected by server (Admin)");
      } else {
        console.log("Socket.IO disconnected (Admin):", reason);
      }
    });

    // Handle connection errors - suppress to prevent runtime errors
    socket.on("connect_error", (error) => {
      // Suppress error to prevent runtime errors in Next.js
      // The connection will automatically retry
      // Only log in production, silently handle in development
      if (process.env.NODE_ENV === "production") {
        console.error("Socket.IO connection error (Admin):", error.message);
      }
      // Don't log or throw in development to prevent Next.js error overlay
    });

    // Handle WebSocket transport errors - catch at the manager level
    const manager = socket.io;
    if (manager) {
      manager.on("error", (error: any) => {
        // Suppress WebSocket transport errors
        // These are expected when backend is not available
        if (process.env.NODE_ENV === "production") {
          console.error("Socket.IO transport error (Admin):", error?.message || error);
        }
        // Silently handle in development - prevent runtime errors
      });

      // Catch engine errors if engine exists
      if (manager.engine) {
        manager.engine.on("error", (error: any) => {
          // Suppress engine-level WebSocket errors
          if (process.env.NODE_ENV === "production") {
            console.error("Socket.IO engine error (Admin):", error?.message || error);
          }
          // Silently handle in development
        });
      }
    }

    // Suppress all errors from bubbling up as runtime errors
    socket.on("error", (error: any) => {
      // Catch-all error handler for any unhandled socket errors
      if (process.env.NODE_ENV === "production") {
        console.error("Socket.IO error (Admin):", error?.message || error);
      }
      // Silently handle in development
    });

    return socket;
  } catch (error) {
    // Catch any initialization errors
    console.warn("Failed to initialize Socket.IO:", error);
    return null;
  }
}

export function disconnectSocket() {
  if (typeof window === "undefined") {
    return;
  }

  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (error) {
      console.warn("Error disconnecting socket:", error);
    } finally {
      socket = null;
    }
  }
}

export function getSocket(): Socket | null {
  return socket;
}

// Re-authenticate socket with a new token
export function reauthenticateSocket(newToken: string): Socket | null {
  // Disconnect existing socket
  if (socket) {
    disconnectSocket();
  }

  // Initialize with new token
  return initializeSocket(newToken);
}

// Event listeners helper
export function onSocketEvent(event: string, callback: (data: any) => void) {
  if (socket) {
    socket.on(event, callback);
  }
}

export function offSocketEvent(event: string, callback?: (data: any) => void) {
  if (socket) {
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }
}

