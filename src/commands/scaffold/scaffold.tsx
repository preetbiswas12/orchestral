/**
 * Project Scaffolding Command
 *
 * Interactive wizard for creating new projects from templates.
 * Supports React, Next.js, Node.js, Python, Rust, Go, and more.
 */

import React, { useState, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import { execa } from 'execa'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

type TemplateId = 'react' | 'nextjs' | 'node' | 'python' | 'rust' | 'go' | 'vue' | 'svelte' | 'express' | 'fastapi'

interface Template {
  id: TemplateId
  name: string
  description: string
  icon: string
  color: string
  deps: string[]
  devDeps: string[]
  files: Record<string, string | ((name: string) => string)>
  postInstall?: string[]
}

const TEMPLATES: Template[] = [
  {
    id: 'react',
    name: 'React + TypeScript',
    description: 'Modern React app with TypeScript, Vite, and Tailwind',
    icon: '⚛️',
    color: 'cyan',
    deps: ['react', 'react-dom'],
    devDeps: ['typescript', 'vite', '@vitejs/plugin-react', 'tailwindcss', 'postcss', 'autoprefixer'],
    files: {
      'src/App.tsx': `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">React + TypeScript</h1>
        <p className="text-gray-400 mb-8">Built with Vite and Tailwind CSS</p>
        <button
          onClick={() => setCount(c => c + 1)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
        >
          Count: {count}
        </button>
      </div>
    </div>
  )
}

export default App`,
      'src/main.tsx': `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`,
      'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`,
      'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
      'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}`,
      'package.json': (name: string) => `{
  "name": "${name}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}`,
    },
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Full-stack React with App Router, TypeScript, and Tailwind',
    icon: '▲',
    color: 'white',
    deps: ['next', 'react', 'react-dom'],
    devDeps: ['typescript', '@types/node', '@types/react', 'tailwindcss', 'postcss', 'autoprefixer'],
    files: {
      'src/app/page.tsx': `export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Next.js App</h1>
        <p className="text-gray-400">Built with App Router and Tailwind CSS</p>
      </div>
    </main>
  )
}`,
      'src/app/layout.tsx': `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Created with scaffold',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`,
      'src/app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      'next.config.ts': `import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig`,
      'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
      'tailwind.config.ts': `import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {} },
  plugins: [],
}
export default config`,
      'package.json': (name: string) => `{
  "name": "${name}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}`,
    },
  },
  {
    id: 'node',
    name: 'Node.js + TypeScript',
    description: 'REST API server with Express, TypeScript, and best practices',
    icon: '🟢',
    color: 'green',
    deps: ['express', 'cors', 'helmet', 'dotenv'],
    devDeps: ['typescript', '@types/express', '@types/cors', '@types/node', 'tsx'],
    files: {
      'src/index.ts': `import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ message: 'API is running', version: '1.0.0' })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`)
})`,
      'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`,
      '.env': `PORT=3000
NODE_ENV=development`,
      'package.json': (name: string) => `{
  "name": "${name}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}`,
    },
  },
  {
    id: 'python',
    name: 'Python + FastAPI',
    description: 'Modern Python API with FastAPI, Pydantic, and async support',
    icon: '🐍',
    color: 'yellow',
    deps: [],
    devDeps: [],
    files: {
      'main.py': `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="My API", version="1.0.0")

class HealthResponse(BaseModel):
    status: str
    version: str

@app.get("/")
async def root():
    return {"message": "API is running", "version": "1.0.0"}

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", version="1.0.0")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)`,
      'requirements.txt': `fastapi>=0.110.0
uvicorn[standard]>=0.29.0
pydantic>=2.0.0`,
      'pyproject.toml': `[project]
name = "my-project"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.29.0",
    "pydantic>=2.0.0",
]

[project.optional-dependencies]
dev = ["pytest", "httpx", "ruff"]`,
      '.env': `APP_ENV=development
PORT=8000`,
    },
  },
  {
    id: 'rust',
    name: 'Rust + Axum',
    description: 'High-performance web API with Axum and Tokio',
    icon: '🦀',
    color: 'red',
    deps: [],
    devDeps: [],
    files: {
      'Cargo.toml': (name: string) => `[package]
name = "${name.replace(/-/g, '_')}"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower-http = { version = "0.5", features = ["cors", "trace"] }
tracing = "0.1"
tracing-subscriber = "0.3"`,
      'src/main.rs': `use axum::{routing::get, Json, Router};
use serde::Deserialize;
use std::net::SocketAddr;

#[derive(serde::Serialize)]
struct HealthResponse {
    status: String,
    version: String,
}

async fn root() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "message": "API is running",
        "version": "1.0.0"
    }))
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        version: "1.0.0".to_string(),
    })
}

#[tokio::main]
async fn main() {
    tracing_subscriber::init();

    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health));

    let addr: SocketAddr = "0.0.0.0:3000".parse().unwrap();
    println!("Server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}`,
    },
  },
  {
    id: 'go',
    name: 'Go API',
    description: 'Simple and fast HTTP API with standard library',
    icon: '🔵',
    color: 'blue',
    deps: [],
    devDeps: [],
    files: {
      'main.go': `package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
    "time"
)

type HealthResponse struct {
    Status    string    \`json:"status"\`
    Version   string    \`json:"version"\`
    Timestamp time.Time \`json:"timestamp"\`
}

func main() {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{
            "message": "API is running",
            "version": "1.0.0",
        })
    })

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(HealthResponse{
            Status:    "ok",
            Version:   "1.0.0",
            Timestamp: time.Now(),
        })
    })

    log.Printf("Server running on http://localhost:%s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}`,
      'go.mod': (name: string) => `module ${name}

go 1.22`,
      '.env': `PORT=8080`,
    },
  },
  {
    id: 'vue',
    name: 'Vue 3 + TypeScript',
    description: 'Vue 3 app with Composition API, TypeScript, and Vite',
    icon: '💚',
    color: 'green',
    deps: ['vue', 'vue-router', 'pinia'],
    devDeps: ['typescript', 'vite', '@vitejs/plugin-vue', 'vue-tsc'],
    files: {
      'src/App.vue': `<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-4xl font-bold mb-4">Vue 3 + TypeScript</h1>
      <p class="text-gray-400 mb-8">Built with Vite and Composition API</p>
      <button
        @click="count++"
        class="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
      >
        Count: {{ count }}
      </button>
    </div>
  </div>
</template>`,
      'src/main.ts': `import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')`,
      'src/style.css': `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; }`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
      'package.json': (name: string) => `{
  "name": "${name}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  }
}`,
    },
  },
  {
    id: 'svelte',
    name: 'Svelte + TypeScript',
    description: 'Svelte app with TypeScript and Vite',
    icon: '🔥',
    color: 'yellow',
    deps: [],
    devDeps: ['svelte', '@sveltejs/vite-plugin-svelte', 'typescript', 'vite', 'tslib'],
    files: {
      'src/App.svelte': `<script lang="ts">
  let count = 0
</script>

<main class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold mb-4">Svelte + TypeScript</h1>
    <p class="text-gray-400 mb-8">Built with Vite</p>
    <button
      on:click={() => count++}
      class="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium"
    >
      Count: {count}
    </button>
  </div>
</main>`,
      'src/main.ts': `import App from './App.svelte'
import './app.css'

const app = new App({ target: document.getElementById('app')! })
export default app`,
      'src/app.css': `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; }`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Svelte App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
      'svelte.config.js': `import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
}`,
      'package.json': (name: string) => `{
  "name": "${name}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}`,
    },
  },
  {
    id: 'express',
    name: 'Express.js',
    description: 'Minimal Express.js server with TypeScript',
    icon: '🚂',
    color: 'white',
    deps: ['express'],
    devDeps: ['typescript', '@types/express', '@types/node', 'tsx'],
    files: {
      'src/index.ts': `import express from 'express'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ message: 'Hello from Express!' })
})

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`)
})`,
      'package.json': (name: string) => `{
  "name": "${name}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}`,
    },
  },
  {
    id: 'fastapi',
    name: 'Python FastAPI (Full)',
    description: 'Full FastAPI project with SQLAlchemy, Alembic, and Docker',
    icon: '⚡',
    color: 'green',
    deps: [],
    devDeps: [],
    files: {
      'app/main.py': `from fastapi import FastAPI
from app.api import router

app = FastAPI(title="My API", version="1.0.0")
app.include_router(router, prefix="/api/v1")`,
      'app/api/__init__.py': `from fastapi import APIRouter
from app.api import health

router = APIRouter()
router.include_router(health.router)`,
      'app/api/health.py': `from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
async def health_check():
    return {"status": "ok"}`,
      'requirements.txt': `fastapi>=0.110.0
uvicorn[standard]>=0.29.0
pydantic>=2.0.0
pydantic-settings>=2.0.0`,
      'Dockerfile': `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`,
    },
  },
]

type Step = 'select' | 'name' | 'creating' | 'done'

export const call: LocalJSXCommandCall = async onDone => {
  return <ScaffoldWizard onClose={onDone} />
}

function ScaffoldWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('select')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [projectName, setProjectName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onClose()
    }

    if (step === 'select') {
      if (key.upArrow && selectedIdx > 0) setSelectedIdx(selectedIdx - 1)
      if (key.downArrow && selectedIdx < TEMPLATES.length - 1) setSelectedIdx(selectedIdx + 1)
      if (key.return) {
        setStep('name')
        setProjectName(TEMPLATES[selectedIdx].id + '-project')
      }
    }

    if (step === 'name') {
      if (key.return && projectName.trim()) {
        createProject()
      }
      if (key.backspace || key.delete) {
        setProjectName(prev => prev.slice(0, -1))
      }
      if (input && !key.ctrl && !key.meta) {
        setProjectName(prev => prev + input)
      }
    }

    if (step === 'done') {
      if (input === 'q' || input === 'd') onClose()
    }
  })

  const createProject = useCallback(async () => {
    setStep('creating')
    setError(null)

    try {
      const template = TEMPLATES[selectedIdx]
      const cwd = process.cwd()
      const projectDir = join(cwd, projectName)

      if (existsSync(projectDir)) {
        setError(`Directory "${projectName}" already exists`)
        setStep('name')
        return
      }

      // Create project directory
      mkdirSync(projectDir, { recursive: true })

      // Create files
      for (const [filePath, content] of Object.entries(template.files)) {
        const fullPath = join(projectDir, filePath)
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
        if (dir !== projectDir) {
          mkdirSync(dir, { recursive: true })
        }
        const fileContent = typeof content === 'function' ? content(projectName) : content
        writeFileSync(fullPath, fileContent)
      }

      // Initialize git
      try {
        await execa('git', ['init'], { cwd: projectDir })
        await execa('git', ['add', '.'], { cwd: projectDir })
        await execa('git', ['commit', '-m', '🎉 Initial commit (scaffolded)'], { cwd: projectDir })
      } catch {
        // Git init is optional
      }

      setStep('done')
    } catch (err) {
      setError(String(err))
      setStep('name')
    }
  }, [selectedIdx, projectName])

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" padding={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color="magenta">🏗️ Project Scaffolder</Text>
        <Text dimColor>q: quit | ↑↓: navigate | enter: select</Text>
      </Box>

      <Box borderStyle="single" borderColor="gray" width="100%" />

      {step === 'select' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Select a template:</Text>
          {TEMPLATES.map((t, i) => (
            <Text key={t.id} color={i === selectedIdx ? 'magenta' : undefined}>
              {i === selectedIdx ? '▸' : ' '}
              {t.icon} {t.name}
              <Text dimColor> — {t.description}</Text>
            </Text>
          ))}
        </Box>
      )}

      {step === 'name' && (
        <Box flexDirection="column" marginY={1}>
          <Text bold>Project name:</Text>
          <Text color="cyan">{projectName}_</Text>
          <Text dimColor>Press enter to create, backspace to edit</Text>
          {error && <Text color="red">Error: {error}</Text>}
        </Box>
      )}

      {step === 'creating' && (
        <Text color="cyan">⏳ Creating project "{projectName}"...</Text>
      )}

      {step === 'done' && (
        <Box flexDirection="column" marginY={1}>
          <Text color="green" bold>✅ Project "{projectName}" created!</Text>
          <Text dimColor>
            {`cd ${projectName}\n`}
            {TEMPLATES[selectedIdx].deps.length > 0 ? `npm install\n` : ''}
            {TEMPLATES[selectedIdx].id === 'python' ? 'pip install -r requirements.txt\n' : ''}
            {TEMPLATES[selectedIdx].id === 'rust' ? 'cargo run\n' : ''}
            {TEMPLATES[selectedIdx].id === 'go' ? 'go run main.go\n' : ''}
            {TEMPLATES[selectedIdx].deps.length > 0 ? 'npm run dev\n' : ''}
          </Text>
          <Text dimColor>Press q to close</Text>
        </Box>
      )}
    </Box>
  )
}

type LocalJSXCommandCall = (onDone: () => void) => Promise<React.ReactElement>
