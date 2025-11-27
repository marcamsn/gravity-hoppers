import { useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars, PointerLockControls, Environment } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Planet } from './components/Planet'
import { Player } from './components/Player'
import { NetworkManager } from './components/NetworkManager'
import * as Colyseus from 'colyseus.js'

function App() {
  const roomRef = useRef<Colyseus.Room | null>(null);

  const handleRoomJoined = (room: Colyseus.Room) => {
    roomRef.current = room;
  };

  const handlePlayerUpdate = (data: any) => {
    if (roomRef.current) {
        roomRef.current.send("updatePosition", data);
    }
  };

  return (
    <>
      <NetworkManager onRoomJoined={handleRoomJoined} />
      <Canvas camera={{ fov: 60 }}>
        <color attach="background" args={['#000020']} />
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <Environment preset="sunset" />
        
        <Physics gravity={[0, 0, 0]}> {/* Disable default gravity */}
          <Planet radius={10} />
          <Player onPositionUpdate={handlePlayerUpdate} />
        </Physics>

        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <PointerLockControls />
        
        <EffectComposer>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={0.5} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
      
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', color: 'white' }}>
        +
      </div>
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white' }}>
        Click to play. WASD to move. Hold Space to jump.
      </div>
    </>
  )
}

export default App
