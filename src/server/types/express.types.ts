/**
 * src/server/types/express.types.ts: Rozszerzenia typów Express
 * Definiuje niestandardowe właściwości dla Request i Response
 */

import type { Request, Response } from 'express';

/**
 * Rozszerzenie Express Request o opcjonalne właściwości
 */
export type AppRequest<P = unknown, ResBody = unknown, ReqBody = unknown, ReqQuery = unknown> =
  Request<P, ResBody, ReqBody, ReqQuery> & { isEmployee?: boolean };

/**
 * Rozszerzenie Express Response o opcjonalne metody pomocnicze
 */
export type AppResponse<T = unknown> = Response<T>;






