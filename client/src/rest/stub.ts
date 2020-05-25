import { RestEndpoint } from './RestEndpoint';

/** Type-checks that [stub] matches the response type of [endpoint] */
export function stub<T extends RestEndpoint>(
  endpoint: T,
  stub: T['response'],
) {
  return stub;
}
