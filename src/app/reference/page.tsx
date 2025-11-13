// src/app/reference/page.tsx

'use client'

import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

export default function ApiReferencePage() {
  return (
    <ApiReferenceReact
      configuration={{
        url: '/openapi.json',
      }}
    />
  )
}