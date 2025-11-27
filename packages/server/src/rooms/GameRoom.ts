import { Room, Client } from "colyseus";
import { GameState, PlayerSchema } from "./schema/GameState";

export class GameRoom extends Room<GameState> {
  maxClients = 20;

  onCreate (options: any) {
    this.setState(new GameState());

    this.onMessage("updatePosition", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.z = data.z;
        player.qx = data.qx;
        player.qy = data.qy;
        player.qz = data.qz;
        player.qw = data.qw;
      }
    });
  }

  onJoin (client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const player = new PlayerSchema();
    // Random start position above the planet
    player.x = 0;
    player.y = 12;
    player.z = 0;
    this.state.players.set(client.sessionId, player);
  }

  onLeave (client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room disposed");
  }
}
