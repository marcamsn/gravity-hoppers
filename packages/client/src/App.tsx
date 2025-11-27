import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'

function App() {
  return (
    <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
      <color attach="background" args={['#111']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>

      <OrbitControls />
      <Stars />
    </Canvas>
  )
}

export default App
