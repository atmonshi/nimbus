import type { ResolvableString } from '@/interfaces/common/resolvable-string';

export interface RequestHeader {
    key: string;
    value: ResolvableString | number | boolean | null;
}

export interface ResponseHeader {
    key: string;
    value: string | number | boolean | null;
}

export interface HttpHeaders {
    key: string;
    value: string | number | boolean | null;
}

export type HttpHeadersArray = HttpHeaders[];
