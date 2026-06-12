'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

const PARTICLE_COUNT = 24
const COLORS = ['#22C55E', '#F8FAFC', '#94A3B8', '#16A34A']

interface Particle {
  id: number
  angle: number
  color: string
  size: number
}

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: (360 / PARTICLE_COUNT) * i + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 2 + Math.random() * 4,
  }))
}

export default function BetSplash({ onFinish }: { onFinish: () => void }) {
  const [particles] = useState(createParticles)
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Wait for particles to fade naturally, then start fading bg
    const t1 = setTimeout(() => setShow(false), 1200)
    // Give exit animations time to complete
    const t2 = setTimeout(() => onFinish(), 2000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onFinish])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash-bg"
          className="fixed inset-0 z-40 bg-[#0F172A]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      )}

      {show && (
        <motion.div
          key="splash-particles"
          className="fixed inset-0 z-50 pointer-events-none"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            {particles.map((p) => (
              <ParticleRay key={p.id} particle={p} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ParticleRay({ particle }: { particle: Particle }) {
  const rad = (particle.angle * Math.PI) / 180
  const x = Math.cos(rad) * 400
  const y = Math.sin(rad) * 400

  return (
    <motion.div
      className="absolute"
      initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
      animate={{ x, y, opacity: 0, scale: 1 }}
      transition={{ duration: 1.2, ease: 'easeOut', delay: particle.id * 0.015 }}
    >
      <div
        className="rounded-full"
        style={{
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          boxShadow: `0 0 6px ${particle.color}`,
        }}
      />
    </motion.div>
  )
}
