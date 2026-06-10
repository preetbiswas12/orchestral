/**
 * Stub for @anthropic-ai/sandbox-runtime
 * Compatibility shim for builds without the internal runtime.
 */

export interface FsReadRestrictionConfig {
  allowedPaths?: string[]
  deniedPaths?: string[]
}

export interface FsWriteRestrictionConfig {
  allowedPaths?: string[]
  deniedPaths?: string[]
}

export interface IgnoreViolationsConfig {
  read?: boolean
  write?: boolean
  network?: boolean
}

export interface NetworkHostPattern {
  host: string
  port?: number
}

export interface NetworkRestrictionConfig {
  allowedHosts?: NetworkHostPattern[]
  deniedHosts?: NetworkHostPattern[]
}

export type SandboxAskCallback = (hostPattern: NetworkHostPattern) => Promise<boolean>

export interface SandboxDependencyCheck {
  errors: string[]
  warnings?: string[]
}

export interface SandboxRuntimeConfig {
  fsRead?: FsReadRestrictionConfig
  fsWrite?: FsWriteRestrictionConfig
  network?: NetworkRestrictionConfig
  ignoreViolations?: IgnoreViolationsConfig
}

export interface SandboxViolationEvent {
  type: 'read' | 'write' | 'network'
  path?: string
  host?: string
  timestamp: Date
}

export const SandboxRuntimeConfigSchema = {
  parse: (config: unknown): SandboxRuntimeConfig => (config as SandboxRuntimeConfig) || {},
  safeParse: (config: unknown) => ({ success: true as const, data: (config as SandboxRuntimeConfig) || {} }),
}

export class SandboxViolationStore {
  private violations: SandboxViolationEvent[] = []

  add(violation: SandboxViolationEvent): void {
    this.violations.push(violation)
  }

  getAll(): SandboxViolationEvent[] {
    return [...this.violations]
  }

  clear(): void {
    this.violations = []
  }
}

const violationStore = new SandboxViolationStore()
let currentConfig: SandboxRuntimeConfig = {}

export class SandboxManager {
  static checkDependencies(_opts?: { command?: string; args?: string[] }): SandboxDependencyCheck {
    return { errors: ['sandbox-runtime unavailable in this build'], warnings: [] }
  }

  static isSupportedPlatform(): boolean {
    return false
  }

  static async initialize(
    config: SandboxRuntimeConfig,
    _askCallback?: SandboxAskCallback,
  ): Promise<void> {
    currentConfig = config || {}
  }

  static updateConfig(config: SandboxRuntimeConfig): void {
    currentConfig = config || {}
  }

  static async wrapWithSandbox(
    command: string,
    _binShell?: string,
    _customConfig?: Partial<SandboxRuntimeConfig>,
    _abortSignal?: AbortSignal,
  ): Promise<string> {
    return command
  }

  static getFsReadConfig(): FsReadRestrictionConfig {
    return currentConfig.fsRead || {}
  }

  static getFsWriteConfig(): FsWriteRestrictionConfig {
    return currentConfig.fsWrite || {}
  }

  static getNetworkRestrictionConfig(): NetworkRestrictionConfig {
    return currentConfig.network || {}
  }

  static getIgnoreViolations(): IgnoreViolationsConfig | undefined {
    return currentConfig.ignoreViolations
  }

  static getAllowUnixSockets(): string[] | undefined {
    return undefined
  }

  static getAllowLocalBinding(): boolean | undefined {
    return undefined
  }

  static getEnableWeakerNestedSandbox(): boolean | undefined {
    return undefined
  }

  static getProxyPort(): number | undefined {
    return undefined
  }

  static getSocksProxyPort(): number | undefined {
    return undefined
  }

  static getLinuxHttpSocketPath(): string | undefined {
    return undefined
  }

  static getLinuxSocksSocketPath(): string | undefined {
    return undefined
  }

  static async waitForNetworkInitialization(): Promise<boolean> {
    return false
  }

  static getSandboxViolationStore(): SandboxViolationStore {
    return violationStore
  }

  static annotateStderrWithSandboxFailures(_command: string, stderr: string): string {
    return stderr
  }

  static cleanupAfterCommand(): void {
    // no-op
  }

  static async reset(): Promise<void> {
    currentConfig = {}
    violationStore.clear()
  }
}

export default SandboxManager
