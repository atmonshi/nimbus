import type { ResolvableString } from '@/interfaces/common/resolvable-string';
import type { AuthorizationType } from '@/interfaces/generated';

/**
 * Base interface for all authorization contracts
 */
interface AuthorizationContractBase {
    type: AuthorizationType;
    value?:
        | ResolvableString
        | number
        | { username: ResolvableString; password: ResolvableString };
}

/**
 * No authorization contract
 */
export interface NoAuthorization extends AuthorizationContractBase {
    type: AuthorizationType.None;
}

/**
 * Bearer token authorization contract
 */
export interface BearerAuthorization extends AuthorizationContractBase {
    type: AuthorizationType.Bearer;
    value: ResolvableString;
}

/**
 * Basic authentication authorization contract
 */
export interface BasicAuthorization extends AuthorizationContractBase {
    type: AuthorizationType.Basic;
    value: {
        username: ResolvableString;
        password: ResolvableString;
    };
}

/**
 * Current user authorization contract
 */
export interface CurrentUserAuthorization extends AuthorizationContractBase {
    type: AuthorizationType.CurrentUser;
}

/**
 * User impersonation authorization contract
 */
export interface ImpersonateAuthorization extends AuthorizationContractBase {
    type: AuthorizationType.Impersonate;
    value: number;
}

/**
 * Union type for all authorization contracts
 */
export type AuthorizationContract =
    | NoAuthorization
    | BearerAuthorization
    | BasicAuthorization
    | CurrentUserAuthorization
    | ImpersonateAuthorization;
