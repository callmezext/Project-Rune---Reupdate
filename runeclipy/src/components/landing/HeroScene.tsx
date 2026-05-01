"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Stars, OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1.8, 64, 64]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color="#8B5CF6"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
}

function FloatingRing({ radius, color, speed }: { radius: number; color: string; speed: number }) {
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.x = state.clock.elapsedTime * speed;
      ringRef.current.rotation.z = state.clock.elapsedTime * speed * 0.5;
    }
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[radius, 0.02, 16, 100]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.6} />
    </mesh>
  );
}

function SmallOrbs() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  const orbs = [
    { pos: [3, 1, -1] as [number, number, number], color: "#EC4899", size: 0.15 },
    { pos: [-2.5, -1.5, 1] as [number, number, number], color: "#8B5CF6", size: 0.12 },
    { pos: [1.5, -2, 2] as [number, number, number], color: "#10B981", size: 0.1 },
    { pos: [-1, 2.5, -1] as [number, number, number], color: "#F59E0B", size: 0.08 },
    { pos: [2, 2, 1.5] as [number, number, number], color: "#3B82F6", size: 0.11 },
  ];

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <Float key={i} speed={3 + i} floatIntensity={0.5}>
          <mesh position={orb.pos}>
            <sphereGeometry args={[orb.size, 16, 16]} />
            <meshStandardMaterial color={orb.color} emissive={orb.color} emissiveIntensity={1} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function HeroScene() {
  return (
    <div className="w-full h-full cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#8B5CF6" />
        <pointLight position={[-10, -5, 5]} intensity={0.5} color="#EC4899" />
        <spotLight position={[0, 10, 0]} intensity={0.8} angle={0.3} penumbra={1} color="#A78BFA" />

        <AnimatedSphere />
        <FloatingRing radius={2.8} color="#8B5CF6" speed={0.3} />
        <FloatingRing radius={3.2} color="#EC4899" speed={-0.2} />
        <FloatingRing radius={3.6} color="#A78BFA" speed={0.15} />
        <SmallOrbs />
        <Stars radius={50} depth={50} count={1000} factor={3} saturation={0} fade speed={1} />

        {/* OrbitControls — enables drag-to-rotate interaction */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>
    </div>
  );
}
