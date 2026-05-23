/**
 * Data API stub — previously used a Manus-specific proxy.
 *
 * This helper is not used by the core application. If you need to call
 * third-party APIs (YouTube, etc.), implement them directly using the
 * provider's own SDK or REST API.
 */

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(
  _apiId: string,
  _options: DataApiCallOptions = {}
): Promise<unknown> {
  throw new Error(
    "callDataApi is not available in self-hosted mode. " +
    "Implement the required API call directly using the provider's SDK or REST API."
  );
}
