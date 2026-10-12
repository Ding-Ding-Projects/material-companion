export interface ProjectScope {
  origin: string;
  path: string;
}
export type DescriptorState =
  | "ready"
  | "loading"
  | "disabled"
  | "stale"
  | "error";
export interface ElementDescriptor {
  id: string;
  parentId?: string;
  role: "group" | "text" | "boolean" | "number" | "choice";
  label: string;
  value?: string | number | boolean;
  options?: string[];
  min?: number;
  max?: number;
  state: DescriptorState;
  help: string;
  actions: string[];
}
export interface ActionDescriptor {
  id: string;
  label: string;
  effect: "read" | "local" | "native";
  input: {
    type: "none" | "text" | "number" | "boolean" | "choice";
    maxLength?: number;
    min?: number;
    max?: number;
    options?: string[];
  };
  requiredGrant?: string;
  reviewRequired: boolean;
  cancellable: boolean;
  retryable: boolean;
}
export interface SurfaceDescriptor {
  id: string;
  route: string;
  owner: string;
  state: DescriptorState;
  revision: number;
  elements: ElementDescriptor[];
}
export interface ProjectDescriptor {
  schemaVersion: 1;
  id: string;
  name: string;
  adapterVersion: string;
  scope: ProjectScope;
  capabilities: string[];
  surfaces: SurfaceDescriptor[];
  actions: ActionDescriptor[];
}
export function canonicalScope(origin: string, path: string): ProjectScope;
export function scopeMatches(
  scope: ProjectScope,
  url: string,
  frameId?: number,
): boolean;
export function validateElement(value: unknown): ElementDescriptor;
export function validateAction(value: unknown): ActionDescriptor;
export function validateProject(value: unknown): ProjectDescriptor;
export function validateInput(
  action: ActionDescriptor,
  input: unknown,
): unknown;
export class AdapterRegistry {
  register(
    descriptor: ProjectDescriptor,
    handlers: Record<
      string,
      (
        input: unknown,
        context: { signal: AbortSignal; progress: (value: number) => void },
      ) => unknown
    >,
  ): () => boolean;
  discover(url: string, frameId?: number): ProjectDescriptor[];
  invalidate(): void;
  invoke(
    projectId: string,
    actionId: string,
    input: unknown,
    context: {
      url: string;
      frameId?: number;
      progress?: (value: { operationId: string; value: number }) => void;
    },
  ): Promise<{
    operationId: string;
    promise: Promise<{ operationId: string; result: unknown }>;
  }>;
  cancel(operationId: string): void;
}
