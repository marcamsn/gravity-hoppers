import React, { useEffect, useState } from 'react';
import * as Colyseus from 'colyseus.js';
import { RemotePlayer } from './RemotePlayer';

// Define the schema types locally for now, or import if we shared them properly
// For prototype, we just need the structure
interface PlayerState {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

interface NetworkManagerProps {
  onRoomJoined: (room: Colyseus.Room) => void;
}

export const NetworkManager: React.FC<NetworkManagerProps> = ({ onRoomJoined }) => {
  const [client] = useState(() => new Colyseus.Client('ws://localhost:2567'));
  const [room, setRoom] = useState<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<Map<string, PlayerState>>(new Map());

  useEffect(() => {
    let mySessionId: string;

    const connect = async () => {
      try {
        const joinedRoom = await client.joinOrCreate<any>('game_room');
        console.log('Joined room:', joinedRoom.name);
        setRoom(joinedRoom);
        onRoomJoined(joinedRoom);
        mySessionId = joinedRoom.sessionId;

        joinedRoom.state.players.onAdd = (player: any, sessionId: string) => {
          if (sessionId === mySessionId) return; // Don't render self as remote player
          console.log('Player joined:', sessionId);
          setPlayers(prev => new Map(prev).set(sessionId, player));
          
          // Listen for changes
          player.onChange = () => {
             setPlayers(prev => {
                const newMap = new Map(prev);
                // Force update to trigger re-render if needed, 
                // but actually R3F components might read directly from the object if we pass it.
                // However, for React state updates, we need a new map.
                // But `player` object is mutable and updated by Colyseus.
                // We just need to trigger a render.
                newMap.set(sessionId, player); 
                return newMap;
             });
          };
        };

        joinedRoom.state.players.onRemove = (_player: any, sessionId: string) => {
          console.log('Player left:', sessionId);
          setPlayers(prev => {
            const newMap = new Map(prev);
            newMap.delete(sessionId);
            return newMap;
          });
        };

      } catch (e) {
        console.error('Join error:', e);
      }
    };

    connect();

    return () => {
      if (room) room.leave();
    };
  }, []);

  return (
    <>
      {Array.from(players.entries()).map(([sessionId, player]) => (
        <RemotePlayer key={sessionId} player={player} />
      ))}
    </>
  );
};
