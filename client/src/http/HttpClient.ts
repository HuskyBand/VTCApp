import { DEFAULT_BASE_API_URL, DEFAULT_API_VERSION } from '@api/Constants.ts';
import TestPermissionOverride, { GlobalTier } from '@client/stores/TestPermissionOverride';

export interface HttpResponse<T = unknown> {
	ok: boolean;
	status: number;
	statusText?: string;
	headers: Record<string, string>;
	body: T;
	text?: string;
	hasErr?: boolean;
	err?: Error;
}

export class HttpClient {
    private _baseUrl: string;
    private _apiVersion: number;
    private _tokenProvider?: () => string | null;
    private _onUnauthorized?: () => void;

    constructor() {
        this._baseUrl = import.meta.env.VITE_API_URL || DEFAULT_BASE_API_URL;
        this._apiVersion = DEFAULT_API_VERSION;
    }

    set tokenProvider(provider: () => string | null) {
        this._tokenProvider = provider;
    }

    /** Called when an authenticated request comes back 401 (expired/invalid token). */
    set onUnauthorized(handler: () => void) {
        this._onUnauthorized = handler;
    }

	async get<T = unknown>(url: string): Promise<HttpResponse<T>> {
		return this.request<T>('GET', url);
	}

	async post<T = unknown>(url: string, body?: unknown, contentType?: string): Promise<HttpResponse<T>> {
		return this.request<T>('POST', url, body, contentType);
	}

	async put<T = unknown>(url: string, body?: unknown, contentType?: string): Promise<HttpResponse<T>> {
		return this.request<T>('PUT', url, body, contentType);
	}

	async patch<T = unknown>(url: string, body?: unknown, contentType?: string): Promise<HttpResponse<T>> {
		return this.request<T>('PATCH', url, body, contentType);
	}

	async delete<T = unknown>(url: string): Promise<HttpResponse<T>> {
		return this.request<T>('DELETE', url);
	}

	private buildRequestHeaders(url: string, body?: unknown, contentType?: string): Record<string, string> {
		const headers: Record<string, string> = {};

		const authToken = this._tokenProvider?.();
		if (authToken && !url.includes('://')) {
			headers.Authorization = `Bearer ${authToken}`;
		}

        const overrideTier = TestPermissionOverride.tier;
        if (!url.includes('://') && overrideTier && overrideTier !== GlobalTier.BandMember) {
            headers['X-Test-Permission'] = overrideTier;
        }

        if (body && !url.includes('://')) {
            if (contentType) {
                headers['Content-Type'] = contentType;
            } else if (!(body instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
            }
        }

		return headers;
	}

	private resolveRequestUrl(url: string): string {
		const requestUrl =
			url.startsWith('//') || url.includes('://')
				? new URL(url, window.location.origin)
				: new URL(`${this._baseUrl}/v${this._apiVersion}${url}`, window.location.origin);

        return requestUrl.toString();
	}

	private serializeBody(body?: unknown): string | FormData | Blob | ArrayBuffer | undefined {
		if (!body) return;

		if (typeof body === 'string' || body instanceof Blob || body instanceof ArrayBuffer || body instanceof FormData) {
			return body;
		}

		return JSON.stringify(body);
	}

	private parseXHRResponse<T>(xhr: XMLHttpRequest): {body: T; text?: string} {
		if (xhr.status === 204) {
			return {body: undefined as T};
		}

		const contentType = xhr.getResponseHeader('content-type') || '';
		const text = xhr.responseText;

		if (contentType.includes('application/json')) {
			if (!text) {
				return {body: undefined as T};
			}

			try {
				return {body: JSON.parse(text) as T, text};
			} catch {
				return {body: text as T, text};
			}
		}

		return {body: text as T, text};
	}

	private parseXHRHeaders(xhr: XMLHttpRequest): Record<string, string> {
		const headerMap: Record<string, string> = {};
		const raw = xhr.getAllResponseHeaders();

		if (!raw) return headerMap;

		for (const line of raw.trim().split(/[\r\n]+/)) {
			const parts = line.split(': ');
			const name = parts.shift();
			const value = parts.join(': ');
			if (name) {
				headerMap[name.toLowerCase()] = value;
			}
		}

		return headerMap;
	}

	private performXHRRequest<T>(
		method: string,
		fullUrl: string,
		headers: Record<string, string>,
		body: string | FormData | Blob | ArrayBuffer | undefined
	): Promise<HttpResponse<T>> {
		return new Promise<HttpResponse<T>>((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			xhr.addEventListener('load', () => {
				const {body: parsedBody, text} = this.parseXHRResponse<T>(xhr);

				const response: HttpResponse<T> = {
					ok: xhr.status >= 200 && xhr.status < 300,
					status: xhr.status,
					statusText: xhr.statusText,
					headers: this.parseXHRHeaders(xhr),
					body: parsedBody,
					text,
				};

				resolve(response);
			});

			xhr.addEventListener('error', () => {
				reject(new Error('Network error during request'));
			});

			xhr.addEventListener('abort', () => {
				reject(new DOMException('Request aborted', 'AbortError'));
			});

			xhr.addEventListener('timeout', () => {
				reject(new DOMException('Request timeout', 'TimeoutError'));
			});

			xhr.open(method, fullUrl);
            xhr.timeout = 10000;

			for (const [name, value] of Object.entries(headers)) {
				xhr.setRequestHeader(name, value);
			}

			xhr.send(body as XMLHttpRequestBodyInit);
		});
	}

    private async request<T = unknown>(method: string, url: string, body?: unknown, contentType?: string): Promise<HttpResponse<T>> {
        const headers = this.buildRequestHeaders(url, body, contentType);
        const serBody = this.serializeBody(body);
        const fullUrl = this.resolveRequestUrl(url);

        const response = await this.performXHRRequest<T>(method, fullUrl, headers, serBody);

        // An authenticated request was rejected — our token is expired/invalid.
        if (response.status === 401 && headers.Authorization) {
            this._onUnauthorized?.();
        }

        return response;
    }
}

export default new HttpClient();