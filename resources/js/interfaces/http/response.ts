import type { HttpHeadersArray, ResponseCookie } from '@/interfaces/http';
import type { ResponseHeader } from '@/interfaces/http/headers';
import type { STATUS } from '@/interfaces/http/status';

export interface Response {
    status: STATUS;
    statusCode: number;
    statusText: string;
    body: string;
    sizeInBytes: number;
    headers: ResponseHeader[];
    cookies: ResponseCookie[];
    timestamp: number;
}

export interface ErrorPlainResponse {
    message: string;
    body?: string;
    status?: number;
}

export interface RelayProxyResponse {
    statusCode: number;
    statusText: string;
    body: string;
    headers: HttpHeadersArray;
    cookies: ResponseCookie[];
    duration: number;
    timestamp: number;
}

export interface ResponseBody {
    content: string;
    contentType: string;
    isJson: boolean;
    parsedJson: Record<string, unknown> | null;
}
