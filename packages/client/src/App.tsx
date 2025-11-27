import { useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars, PointerLockControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { PlanetSystem } from './components/PlanetSystem'
import { Player } from './components/Player'
import { NetworkManager } from './components/NetworkManager'
import { MinimapOverlay } from './components/Minimap'
import { OffscreenIndicators } from './components/OffscreenIndicators'
import { SkyGradient } from './components/SkyGradient'
import * as Colyseus from 'colyseus.js'
import * as THREE from 'three'

function App() {
  const roomRef = useRef<Colyseus.Room | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [playerPosition, setPlayerPosition] = useState(() => new THREE.Vector3());
  const [cameraForward, setCameraForward] = useState(() => new THREE.Vector3(0, 0, -1));
  const [cameraUp, setCameraUp] = useState(() => new THREE.Vector3(0, 1, 0));
  const [remotePlayers, setRemotePlayers] = useState<Array<{ x: number; y: number; z: number }>>([]);

  const handleRoomJoined = (room: Colyseus.Room) => {
    roomRef.current = room;
  };

  const handlePlayerUpdate = (data: any) => {
    if (roomRef.current) {
        roomRef.current.send("updatePosition", data);
    }
    // Update local position for minimap (create new Vector3 to trigger re-render)
    setPlayerPosition(new THREE.Vector3(data.x, data.y, data.z));
    // Update camera vectors for 3D radar
    setCameraForward(new THREE.Vector3(data.cameraForward.x, data.cameraForward.y, data.cameraForward.z));
    setCameraUp(new THREE.Vector3(data.cameraUp.x, data.cameraUp.y, data.cameraUp.z));
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
  };

  const handleRemotePlayersUpdate = (players: Array<{ x: number; y: number; z: number }>) => {
    setRemotePlayers(players);
  };

  return (
    <>
      <Canvas camera={{ fov: 60, near: 0.1, far: 10000 }}>
        <SkyGradient />
        <ambientLight intensity={2.0} />
        <directionalLight position={[50, 50, 50]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-50, -50, -50]} intensity={0.8} color="#ffe0f0" />
        <hemisphereLight args={['#ffffff', '#ffe0ff', 1.2]} />

        <Physics gravity={[0, 0, 0]}> {/* Disable default gravity */}
          <PlanetSystem />
          <Player onPositionUpdate={handlePlayerUpdate} />
        </Physics>

        <NetworkManager
          onRoomJoined={handleRoomJoined}
          onPlayerCountChange={handlePlayerCountChange}
          onRemotePlayersUpdate={handleRemotePlayersUpdate}
        />

        <Stars radius={2000} depth={2000} count={5000} factor={4} saturation={0.5} fade speed={0.5} />
        <PointerLockControls />

        <EffectComposer>
            <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} height={300} intensity={0.8} />
            <Vignette eskil={false} offset={0.1} darkness={0.5} />
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

      <MinimapOverlay playerPosition={playerPosition} cameraForward={cameraForward} cameraUp={cameraUp} remotePlayers={remotePlayers} />
      <OffscreenIndicators playerPosition={playerPosition} cameraForward={cameraForward} cameraUp={cameraUp} remotePlayers={remotePlayers} />
    </>
  )
}

export default App
