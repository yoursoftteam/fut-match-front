'use client'

import { AuthGuard } from '@/components/AuthGuard'
import CreateMatchClient from './CreateMatchClient'

export default function CreateMatchWrapper() {
  return (
    <AuthGuard>
      <CreateMatchClient />
    </AuthGuard>
  )
}
