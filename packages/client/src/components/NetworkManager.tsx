import React, { useEffect, useState, useRef } from 'react';
import * as Colyseus from 'colyseus.js';
import { RemotePlayer } from './RemotePlayer';

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
  onPlayerCountChange?: (count: number) => void;
  onRemotePlayersUpdate?: (players: Array<{ x: number; y: number; z: number }>) => void;
}

export const NetworkManager: React.FC<NetworkManagerProps> = ({ onRoomJoined, onPlayerCountChange, onRemotePlayersUpdate }) => {
  const [client] = useState(() => new Colyseus.Client('ws://localhost:2567'));
  const roomRef = useRef<Colyseus.Room | null>(null);
  const [players, setPlayers] = useState<Map<string, PlayerState>>(new Map());
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Store callbacks in refs to avoid re-running effect
  const onRoomJoinedRef = useRef(onRoomJoined);
  const onPlayerCountChangeRef = useRef(onPlayerCountChange);
  const onRemotePlayersUpdateRef = useRef(onRemotePlayersUpdate);
  onRoomJoinedRef.current = onRoomJoined;
  onPlayerCountChangeRef.current = onPlayerCountChange;
  onRemotePlayersUpdateRef.current = onRemotePlayersUpdate;

  // Notify parent of player count changes
  useEffect(() => {
    onPlayerCountChangeRef.current?.(totalPlayers);
  }, [totalPlayers]);

  // Notify parent of remote players positions for minimap
  useEffect(() => {
    const positions = Array.from(players.values()).map(p => ({ x: p.x, y: p.y, z: p.z }));
    onRemotePlayersUpdateRef.current?.(positions);
  }, [players]);

  useEffect(() => {
    let mySessionId: string;
    let mounted = true;

    const connect = async () => {
      try {
        const joinedRoom = await client.joinOrCreate<any>('game_room');
        if (!mounted) {
          joinedRoom.leave();
          return;
        }

        console.log('Joined room:', joinedRoom.name, 'Session:', joinedRoom.sessionId);
        roomRef.current = joinedRoom;
        onRoomJoinedRef.current(joinedRoom);
        mySessionId = joinedRoom.sessionId;

        // Set initial player count from existing players
        const initialCount = joinedRoom.state.players.size;
        console.log('Initial players in room:', initialCount);
        setTotalPlayers(initialCount);

        joinedRoom.state.players.onAdd((player: any, sessionId: string) => {
          console.log('Player joined:', sessionId, '(self:', sessionId === mySessionId, ')');
          setTotalPlayers(joinedRoom.state.players.size);

          if (sessionId === mySessionId) return; // Don't render self as remote player
          setPlayers(prev => new Map(prev).set(sessionId, player));

          // Listen for changes
          player.onChange(() => {
             setPlayers(prev => {
                const newMap = new Map(prev);
                newMap.set(sessionId, player);
                return newMap;
             });
          });
        });

        joinedRoom.state.players.onRemove((_player: any, sessionId: string) => {
          console.log('Player left:', sessionId);
          setTotalPlayers(joinedRoom.state.players.size);
          setPlayers(prev => {
            const newMap = new Map(prev);
            newMap.delete(sessionId);
            return newMap;
          });
        });

      } catch (e) {
        console.error('Join error:', e);
      }
    };

    connect();

    return () => {
      mounted = false;
      if (roomRef.current) {
        roomRef.current.leave();
        roomRef.current = null;
      }
    };
  }, [client]);

  return (
    <>
      {Array.from(players.entries()).map(([sessionId, player]) => (
        <RemotePlayer key={sessionId} player={player} />
      ))}
    </>
  );
};
