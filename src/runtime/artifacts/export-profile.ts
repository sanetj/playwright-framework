export enum ExportProfileMode {
  CONCISE_AI = 'concise-ai',
  HACKERONE_HUMAN = 'hackerone-human',
  FORENSIC_FULL = 'forensic-full',
  REPLAY_DEBUG = 'replay-debug'
}

export interface ExportProfileConfig {
  includeFullResponseBody: boolean;
  includeHeaders: boolean;
  includeReproducibilityScore: boolean;
  includeRawTrace: boolean;
  truncateBodiesOverBytes: number;
}

export class ExportProfileManager {
  
  public getConfig(mode: ExportProfileMode): ExportProfileConfig {
    switch (mode) {
      case ExportProfileMode.CONCISE_AI:
        return {
          includeFullResponseBody: false,
          includeHeaders: false, // Minimal headers usually kept by optimizer
          includeReproducibilityScore: true,
          includeRawTrace: false,
          truncateBodiesOverBytes: 500 // Extremely aggressive for token saving
        };
      case ExportProfileMode.HACKERONE_HUMAN:
        return {
          includeFullResponseBody: true,
          includeHeaders: true,
          includeReproducibilityScore: true,
          includeRawTrace: false,
          truncateBodiesOverBytes: 10000 // Humans don't want 1MB bodies either
        };
      case ExportProfileMode.FORENSIC_FULL:
        return {
          includeFullResponseBody: true,
          includeHeaders: true,
          includeReproducibilityScore: true,
          includeRawTrace: true,
          truncateBodiesOverBytes: Number.MAX_SAFE_INTEGER
        };
      case ExportProfileMode.REPLAY_DEBUG:
        return {
          includeFullResponseBody: false,
          includeHeaders: true,
          includeReproducibilityScore: true,
          includeRawTrace: true,
          truncateBodiesOverBytes: 2000
        };
      default:
        throw new Error(`Unknown export profile: ${mode}`);
    }
  }
}
