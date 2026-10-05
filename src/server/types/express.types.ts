/**
 * src/server/types/express.types.ts: Rozszerzenia typów Express
 * Definiuje niestandardowe właściwości dla Request i Response
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Rozszerzenie Express Request o opcjonalne właściwości
 */
export type AppRequest<P = unknown, ResBody = unknown, ReqBody = unknown, ReqQuery = unknown> = Request<P, ResBody, ReqBody, ReqQuery>;

/**
 * Rozszerzenie Express Response o opcjonalne metody pomocnicze
 */
export type AppResponse<T = unknown> = Response<T>;

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






