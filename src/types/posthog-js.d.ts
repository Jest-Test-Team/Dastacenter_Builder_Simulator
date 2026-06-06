declare module 'posthog-js' {
  export interface PostHog {
    __loaded?: boolean;
    init(key: string, options?: Record<string, unknown>): void;
    capture(name: string, props?: Record<string, unknown>): void;
    identify(distinctId: string, props?: Record<string, unknown>): void;
    reset(): void;
  }
  const posthog: PostHog;
  export default posthog;
}
