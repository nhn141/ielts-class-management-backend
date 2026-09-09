import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      let token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization ||
        client.handshake.query?.token;

      if (token && typeof token === 'string') {
        if (token.startsWith('Bearer ')) {
          token = token.slice(7).trim();
        }
        const payload = this.jwtService.verify(token);
        if (payload && payload.sub) {
          client.data.user = payload;
          const userRoom = `user_${payload.sub}`;
          await client.join(userRoom);
          this.logger.log(
            `Client connected: ${client.id} -> User: ${payload.sub} (${payload.email}) joined room ${userRoom}`,
          );
          return;
        }
      }
      this.logger.log(`Anonymous or unauthenticated client connected: ${client.id}`);
    } catch (err: any) {
      this.logger.warn(`Client connection auth failed: ${client.id}, reason: ${err.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Send realtime notification / event to a specific user
   */
  sendToUser(userId: string, event: string, payload: any) {
    const room = `user_${userId}`;
    this.server.to(room).emit(event, payload);
    this.logger.log(`Emitted event "${event}" to room "${room}"`);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: string, payload: any) {
    this.server.emit(event, payload);
    this.logger.log(`Broadcast event "${event}" to all clients`);
  }
}
