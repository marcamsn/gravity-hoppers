import { useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars, PointerLockControls, Environment } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { PlanetSystem } from './components/PlanetSystem'
import { Player } from './components/Player'
import { NetworkManager } from './components/NetworkManager'
import * as Colyseus from 'colyseus.js'

function App() {
  const roomRef = useRef<Colyseus.Room | null>(null);
  const [playerCount, setPlayerCount] = useState(0);

  const handleRoomJoined = (room: Colyseus.Room) => {
    roomRef.current = room;
  };

  const handlePlayerUpdate = (data: any) => {
    if (roomRef.current) {
        roomRef.current.send("updatePosition", data);
    }
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
  };

  return (
    <>
      <Canvas camera={{ fov: 60 }}>
        <color attach="background" args={['#000020']} />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <Environment preset="sunset" />

        <Physics gravity={[0, 0, 0]}> {/* Disable default gravity */}
          <PlanetSystem />
          <Player onPositionUpdate={handlePlayerUpdate} />
        </Physics>

        <NetworkManager
          onRoomJoined={handleRoomJoined}
          onPlayerCountChange={handlePlayerCountChange}
        />

        <Stars radius={800} depth={200} count={10000} factor={6} saturation={0} fade speed={0.5} />
        <PointerLockControls />

        <EffectComposer>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={0.5} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>

      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', color: 'white' }}>
        +
      </div>
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'monospace' }}>
        <div>Click to play</div>
        <div>Mouse: Look around</div>
        <div>Space / Left Click: Forward thrust</div>
        <div>S / Right Click: Reverse thrust</div>
      </div>
      <div style={{ position: 'absolute', top: 20, right: 20, color: 'white', fontFamily: 'monospace', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px' }}>
        <div>Players Online: {playerCount}</div>
      </div>
    </>
  )
}

export default App
