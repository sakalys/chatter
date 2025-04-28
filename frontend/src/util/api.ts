import { tokenStorage } from "../context/AuthContext";

export interface ApiUserProfile {
}

export enum PaginationVars {
    Page = 'page',
    Limit = 'limit',
}

interface PaginationParams {
    [PaginationVars.Page]?: number,
    [PaginationVars.Limit]?: number,
}

export const withPaginationParams = <T = object>(obj: T, {
    page = 1,
    limit = 20
}: PaginationParams): T & Required<PaginationParams> => {
    return {...obj, page, limit};
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export const apiFetchAnonymous = async <T = unknown, TData = unknown>(method: Method, endpoint: string, data: TData | null = null): Promise<T> => {
    return _apiFetch<T, TData>(method, endpoint, data);
}

interface FetchOpts {
    multipart?: boolean
    headers?: HeadersInit
}

export const apiFetch = async <T = unknown, TData = unknown>(method: Method, endpoint: string, data: TData | null = null, opts: FetchOpts = {}): Promise<T> => {
    return apiFetchWithToken<T, TData>(tokenStorage.token, method, endpoint, data, opts);
};

export const apiFetchWithToken = async <T = unknown, TData = unknown>(token: string, method: Method, endpoint: string, data: TData | null = null, opts: FetchOpts = {}): Promise<T> => {

    opts.headers = {
        ...(opts.headers || {}),
        'authorization': 'Bearer ' + token,
    };

    return _apiFetch<T, TData>(method, endpoint, data, opts);
};

const apiUrl = import.meta.env.VITE_API_URL;

const _apiFetch = async <T = unknown, TData = unknown>(method: Method, endpoint: string, data: TData | null = null, {
    headers = {},
    multipart = false,
}: FetchOpts = {}): Promise<T> => {
    endpoint = apiUrl + '/api/v1' + endpoint;

    const uri = new URL(endpoint);


    const init: RequestInit = {
        method,
        headers,
    };

    if (method !== 'GET' && !multipart) {
        init.headers = {
            ...init.headers,
            'content-type': 'application/json',
        }
    }

    (init.headers as Record<string, string>)['accept'] = 'application/json';

    if (data !== null && method !== 'GET') {
        if (multipart) {
            const formData = new FormData();

            if (typeof data === 'object') {
                Object.keys(data as any).forEach(key => {
                    const item = (data as any)[key];
                    formData.append(key, item);
                })
            }

            init.body = formData;
        } else {
            init.body = JSON.stringify(data);
        }
    }


    let response;
    try {
        response = await fetch(uri, init)
    } catch (e) {
        throw new FetchError();
    }

    let json = null
    try {
        json = await response.json();
    } catch (e) {
        throw new ServerError({}, response);
    }

    if (response.ok) {
        return json;
    }

    if (response.status >= 400 && response.status < 500) {
        throw new ClientError(json, response);
    }

    if (response.status >= 500) {
        throw new ServerError(json, response);
    }

    throw new UnrecognizedError(json);
}

export class HttpError extends Error {
    constructor(
        message: string,
        private readonly _body: any,
        private readonly _response: Response,
    ) {
        super(message);
    }

    get json(): any {
        return this._body;
    }

    get response(): Response {
        return this._response;
    }
}

export class ClientError extends HttpError {
    constructor(_responseJson: any, response: Response) {
        super('Client error', _responseJson, response);
    }
}

export class ServerError extends HttpError {
    constructor(_responseJson: any, response: Response) {
        super('Server error', _responseJson, response);
    }
}

export class FetchError extends Error {
    constructor() {
        super('Request failed');
    }
}

export class UnrecognizedError extends Error {
    constructor(private readonly _response: any) {
        super('Request failed');
    }

    get json(): any {
        return this._response;
    }
}

export const pathWithSearchParams = (path: string, params: Record<string, string | number>) => {
    const search = Object.keys(params).map(key => `${key}=${params[key]}`).join('&')

    if (!search) {
        return path;
    }

    return path + '?' + search;
}

export const superSwitch = <TType extends string | symbol | number, TData = unknown>(key: TType, cases: Record<TType, (() => TData) | TData>) => {
    const res = cases[key];
    return typeof res === 'function' ? res() : res;
}
