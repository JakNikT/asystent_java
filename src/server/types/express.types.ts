/**
 * src/server/types/express.types.ts: Rozszerzenia typów Express
 * Definiuje niestandardowe właściwości dla Request i Response
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Rozszerzenie Express Request o opcjonalne właściwości
 */
export interface AppRequest<P = unknown, ResBody = unknown, ReqBody = unknown, ReqQuery = unknown> extends Request<P, ResBody, ReqBody, ReqQuery> {
  // Można dodać niestandardowe właściwości jeśli będą potrzebne
  // np. user?: User;
  // np. session?: Session;
}

/**
 * Rozszerzenie Express Response o opcjonalne metody pomocnicze
 */
export interface AppResponse<T = unknown> extends Response<T> {
  // Można dodać niestandardowe metody jeśli będą potrzebne
}

/**
 * Typ dla Express middleware
 */
export type AppMiddleware = (
  req: AppRequest,
  res: AppResponse,
  next: NextFunction
) => void | Promise<void>;

/**
 * Typ dla Express route handler
 */
export type AppRouteHandler = (
  req: AppRequest,
  res: AppResponse,
  next?: NextFunction
) => void | Promise<void>;
